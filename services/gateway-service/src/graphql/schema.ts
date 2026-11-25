import { buildSchema } from 'graphql';
import { AuthContext } from '../middlewares/auth';
import { ProjectService } from '../services/projectService';

export const gatewayGraphqlSchema = buildSchema(`
  type TaskSummary {
    taskId: ID!
    stageId: ID!
    title: String!
    taskType: String!
    status: String!
    assignedUserId: String
    deadline: String
    efficiencyScore: Float
  }

  type StageSummary {
    stageId: ID!
    name: String!
    orderIndex: Int!
    status: String!
    tasks: [TaskSummary!]!
  }

  type ProjectSummary {
    projectId: ID!
    orgId: String!
    title: String!
    status: String!
    stages: [StageSummary!]!
  }

  type AiStageSuggestion {
    name: String!
    orderIndex: Int!
    recommendedRole: String!
  }

  type AiBlueprint {
    suggestedTitle: String!
    summary: String!
    stages: [AiStageSuggestion!]!
  }

  type Query {
    projects: [ProjectSummary!]!
    project(projectId: ID!): ProjectSummary
  }

  type Mutation {
    createProject(title: String!, description: String): ProjectSummary!
    createStage(projectId: ID!, name: String!, orderIndex: Int!): StageSummary!
    createTask(projectId: ID!, stageId: ID!, title: String!, taskType: String, assignedUserId: String, deadline: String): TaskSummary!
    invitePartnerOrg(projectId: ID!, partnerOrgId: String!, userId: String!, roleName: String!, allocatedStageIds: [String!]!): Boolean!
    generateAiProjectPlan(prompt: String!, industryHint: String): AiBlueprint!
  }
`);

export function createGraphqlRoot(auth: AuthContext) {
  return {
    projects: () => ProjectService.listProjects(auth),
    project: ({ projectId }: { projectId: string }) => ProjectService.getProjectTree(auth, projectId),
    createProject: ({ title, description }: { title: string; description?: string }) =>
      ProjectService.createProject(auth, title, description),
    createStage: ({ projectId, name, orderIndex }: { projectId: string; name: string; orderIndex: number }) =>
      ProjectService.createStage(auth, projectId, name, orderIndex),
    createTask: (args: {
      projectId: string;
      stageId: string;
      title: string;
      taskType?: string;
      assignedUserId?: string;
      deadline?: string;
    }) => ProjectService.createTask(auth, args),
    invitePartnerOrg: (args: {
      projectId: string;
      partnerOrgId: string;
      userId: string;
      roleName: string;
      allocatedStageIds: string[];
    }) => ProjectService.invitePartnerOrg(auth, args),
    generateAiProjectPlan: ({ prompt, industryHint }: { prompt: string; industryHint?: string }) =>
      ProjectService.generateAiPlan(auth, prompt, industryHint),
  };
}
