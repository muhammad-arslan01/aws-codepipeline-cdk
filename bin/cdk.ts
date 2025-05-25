#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FastAPILambdaPipelineStack } from '../lib/fast-api-lambda-pipeline-stack';

const app = new cdk.App();
new FastAPILambdaPipelineStack(app, 'FastAPILambdaPipelineStack', {})