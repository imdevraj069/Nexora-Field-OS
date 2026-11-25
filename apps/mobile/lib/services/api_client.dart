import 'package:dio/dio.dart';

/// REST & Evidence Upload Client targeting Cloudflare-tunneled Nexora API Gateway.
class NexoraApiClient {
  NexoraApiClient({required String baseUrl, String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 30),
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  Future<Response<dynamic>> submitTaskEvidence({
    required String projectId,
    required String taskId,
    required String textNote,
    String? filePath,
    List<String> tags = const ['field-evidence'],
  }) async {
    final formData = FormData.fromMap({
      'textNote': textNote,
      'tags': tags.toString(),
      if (filePath != null) 'file': await MultipartFile.fromFile(filePath),
    });

    return _dio.post(
      '/api/v1/projects/$projectId/tasks/$taskId/evidence',
      data: formData,
    );
  }
}
