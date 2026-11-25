import { startAiGrpcServer } from './grpc/aiGrpcServer';
import { startAiJobsConsumer } from './consumers/aiJobsConsumer';

startAiGrpcServer();
startAiJobsConsumer();
