import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as iam from 'aws-cdk-lib/aws-iam';


export class FastAPILambdaPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Add pipeline-level variables for branch name and ECR tag
        const branchVariable = new codepipeline.Variable({
            variableName: 'branchName',
            defaultValue: 'bronze',
            description: 'The branch to use for the pipeline', 
        });

        const ecrTagVariable = new codepipeline.Variable({
            variableName: 'ecrTag',
            defaultValue: 'latest',
            description: 'The ECR tag to use for the Docker image',
        });


        // S3 bucket where intermediate files (source code, build outputs, etc.) are stored between pipeline stages
        const artifactBucket = new s3.Bucket(this, 'PipelineArtifactBucket');

        const sourceArtifact = new codepipeline.Artifact(); //S3 bucket for storing pipeline stage artifacts
        const buildArtifact = new codepipeline.Artifact();

        const codeCommitRepo = codecommit.Repository.fromRepositoryName(
            this,
            'CodeCommitRepo',
            'fast-api-lambda' // Replace with your CodeCommit repository name
        );

        // IAM role that grants CodeBuild permissions to access ECR and perform build operations
        const buildRole = new iam.Role(this, 'BuildRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser'),
            ],
        });

        // IAM role allowing CodeBuild to deploy (create, update, invoke) AWS Lambda functions
        const deployRole = new iam.Role(this, 'DeployRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'),
            ],
        });

        // Source Action for CodeCommit
        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'CodeCommit_Source',
            repository: codeCommitRepo,
            branch: 'bronze', // This is the same branch on which if code is pushed, Eventbridge triggers codepipeline.
            output: sourceArtifact,
        });

        // CodeBuild project to clone code commit repo, build and push Docker image to Amazon ECR
        const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            role: buildRole,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0, // Supports Docker builds
                privileged: true, // Required for Docker builds
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'docker --version', // Ensure Docker is available
                        ],
                    },
                    pre_build: {
                        commands: [
                            'echo Cloning the repository',
                            'git clone -b $BRANCH_NAME https://$USERNAME:$TOKEN@git-codecommit.$REGION.amazonaws.com/v1/repos/fast-api-lambda-repo',
                            'cd fast-api-lambda',
                            'ls -al',

                            'echo Logging in to Amazon ECR',
                            `aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com`,

                        ],
                    },
                    build: {
                        commands: [
                            'echo Building the Docker image',
                            'docker build -t app .',
                            'docker tag app:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fast-api-lambda-ecr:$ECR_TAG',
                        ],
                    },
                    post_build: {
                        commands: [
                            'echo Pushing the Docker image to ECR',
                            'docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fast-api-lambda-ecr:$ECR_TAG',
                        ],
                    },
                }
            }),
        });

        // CodePipeline build action that runs the CodeBuild project with environment variables
        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'Build',
            project: buildProject,
            input: sourceArtifact,
            outputs: [buildArtifact],
            environmentVariables: {
                BRANCH_NAME: { value: branchVariable.reference() },
                ECR_TAG: { value: ecrTagVariable.reference() },
            },
        });

        // Code build project to update Lambda Function with the Latest Docker Image
        const deployProject = new codebuild.PipelineProject(this, 'DeployProject', {
            role: deployRole,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    pre_build: {
                        commands: [
                            'echo Preparing to deploy Docker image to Lambda',
                        ],
                    },
                    build: {
                        commands: [

                            'echo Updating Lambda function with the latest Docker image',
                            `aws lambda update-function-code \
                  --function-name fast-api-lambda \
                  --image-uri ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fast-api-lambda-ecr:$ECR_TAG`,
                        ],
                    },
                    post_build: {
                        commands: [
                            'echo Deployment to Lambda completed',
                        ],
                    },
                },
            }),
        });

        // CodePipeline deploy action that runs the CodeBuild project(deployProject) with environment variables
        const deployAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'Deploy',
            project: deployProject,
            input: buildArtifact,
            environmentVariables: {
                BRANCH_NAME: { value: branchVariable.reference() },
                ECR_TAG: { value: ecrTagVariable.reference() },
            },
        });

        // CodePipeline with Source, Build, and Deploy stages for the Lambda
        const pipeline = new codepipeline.Pipeline(this, 'CodePipelineFastAPILambda', {
            pipelineName: 'CodePipelineFastAPILambda',
            artifactBucket: artifactBucket,
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction],
                },
                {
                    stageName: 'Build',
                    actions: [buildAction],
                },

                {
                    stageName: 'Deploy',
                    actions: [deployAction],
                },
            ],
        });

        pipeline.addVariable(branchVariable);
        pipeline.addVariable(ecrTagVariable);
    }
}