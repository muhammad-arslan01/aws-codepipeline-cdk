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