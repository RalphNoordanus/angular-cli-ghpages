import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { experimental, join, normalize, json } from '@angular-devkit/core';
import { Schema as RealDeployOptions } from './schema';

import deploy from './actions';
import * as engine from '../engine/engine';

type DeployOptions = RealDeployOptions & json.JsonObject;

// Call the createBuilder() function to create a builder. This mirrors
// createJobHandler() but add typings specific to Architect Builders.
export default createBuilder<any>(
  async (
    options: DeployOptions,
    context: BuilderContext
  ): Promise<BuilderOutput> => {
    // The project root is added to a BuilderContext.
    const root = normalize(context.workspaceRoot);
    const workspace = new experimental.workspace.Workspace(
      root,
      new NodeJsSyncHost()
    );
    await workspace
      .loadWorkspaceFromHost(normalize('angular.json'))
      .toPromise();

    if (!context.target) {
      throw new Error('Cannot deploy the application without a target');
    }

    const targets = workspace.getProjectTargets(context.target.project);

    if (
      !targets ||
      !targets.build ||
      !targets.build.options ||
      !targets.build.options.outputPath
    ) {
      throw new Error('Cannot find the project output directory');
    }

    try {
      await deploy(
        engine,
        context,
        join(workspace.root, targets.build.options.outputPath),
        options
      );
    } catch (e) {
      context.logger.error('Error when trying to deploy:', e);
      console.error(e);
      return { success: false };
    }

    return { success: true };
  }
);
