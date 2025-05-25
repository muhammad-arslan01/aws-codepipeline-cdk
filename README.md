# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `cdk deploy`  deploy this stack to your default AWS account/region
* `cdk diff`    compare deployed stack with current state
* `cdk synth`   emits the synthesized CloudFormation template
* `cdk destroy` destroys the stack


## artifactBucket  
It is the S3 bucket where intermediate files (source code, build outputs, etc.) are stored between pipeline stages. It ensures each stage gets the files it needs from the previous one.


## 📦 CI/CD Pipeline with AWS CDK for Dockerized Lambda Deployment
This project demonstrates a fully automated CI/CD pipeline built with AWS CDK (TypeScript) to deploy Dockerized AWS Lambda functions. It uses AWS CodePipeline, CodeBuild, ECR, and CodeCommit, all defined as infrastructure-as-code.

🚀 Features:
End-to-end CI/CD pipeline with AWS CDK

Deploys Docker-based Lambda functions automatically

Builds and pushes Docker images to Amazon ECR

Automated deployments

No manual AWS Console steps – everything is code-driven

🛠️ AWS Services Used:
AWS CodeCommit – Source repository

AWS CodePipeline – CI/CD orchestration

AWS CodeBuild – Docker image build & ECR push

AWS Lambda – Deployed using Docker image from ECR

AWS CDK (TypeScript) – Infrastructure provisioning