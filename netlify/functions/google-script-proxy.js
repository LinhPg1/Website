export async function handler(event, context) {
  const REAL_GOOGLE_SHEET_URL = process.env.REAL_GOOGLE_SHEET_URL;

  // Định nghĩa các tiêu đề chung cho tất cả các phản hồi để đảm bảo CORS
  const commonHeaders = {
    'Access-Control-Allow-Origin': '*', // Cho phép mọi nguồn gốc
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Các phương thức được phép
    'Access-Control-Allow-Headers': 'Content-Type', // Các tiêu đề được phép
    'Content-Type': 'application/json', // Mặc định phản hồi là JSON
  };

  // Xử lý yêu cầu OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // Không có nội dung, thành công
      headers: commonHeaders, // Dùng headers chung
      body: ''
    };
  }

  // Kiểm tra biến môi trường URL Google Script
  if (!REAL_GOOGLE_SHEET_URL) {
    return {
      statusCode: 500, // Lỗi máy chủ nội bộ
      headers: commonHeaders, // Kèm headers CORS
      body: JSON.stringify({ message: "Lỗi cấu hình phía máy chủ: URL của Google Script chưa được định nghĩa." }),
    };
  }

  // Kiểm tra phương thức HTTP. Chỉ chấp nhận POST.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Phương thức không được phép
      headers: commonHeaders, // Kèm headers CORS
      body: JSON.stringify({ message: 'Phương thức không hợp lệ. Chỉ chấp nhận POST.' }),
    };
  }

  let requestBody;
  try {
    // Thử phân tích cú pháp JSON từ event.body
    // event.body thường là một chuỗi JSON từ yêu cầu HTTP
    requestBody = JSON.parse(event.body);
  } catch (parseError) {
    console.error('Lỗi phân tích cú pháp JSON từ request body:', parseError);
    return {
      statusCode: 400, // Yêu cầu không hợp lệ
      headers: commonHeaders, // Kèm headers CORS
      body: JSON.stringify({ message: "Dữ liệu JSON gửi lên không hợp lệ." }),
    };
  }

  try {
    // Gửi yêu cầu POST đến Google Script
    const response = await fetch(REAL_GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Đảm bảo Google Script nhận đúng định dạng
      },
      body: JSON.stringify(requestBody), // Gửi đối tượng đã phân tích cú pháp (và stringify lại)
    });

    // Kiểm tra nếu phản hồi từ Google Script không thành công (ví dụ: status 4xx, 5xx)
    if (!response.ok) {
      let errorData;
      try {
        // Cố gắng phân tích phản hồi lỗi dưới dạng JSON
        errorData = await response.json();
      } catch (e) {
        // Nếu không phải JSON, tạo một thông báo lỗi chung
        errorData = { message: `Google Script trả về lỗi không phải JSON. Mã trạng thái: ${response.status}. Chi tiết: ${await response.text()}` };
        console.error('Lỗi không phải JSON từ Google Script:', errorData.message);
      }

      return {
        statusCode: response.status, // Trả về mã lỗi từ Google Script
        headers: commonHeaders, // Kèm headers CORS
        body: JSON.stringify(errorData), // Trả về dữ liệu lỗi
      };
    }

    // Nếu phản hồi thành công, phân tích JSON và trả về
    const data = await response.json();

    return {
      statusCode: 200, // Thành công
      headers: commonHeaders, // Kèm headers CORS
      body: JSON.stringify(data), // Trả về dữ liệu từ Google Script
    };
  } catch (error) {
    // Bắt lỗi trong quá trình fetch hoặc xử lý
    console.error('Lỗi trong proxy function:', error);
    return {
      statusCode: 502, // Bad Gateway (Lỗi khi giao tiếp với dịch vụ khác)
      headers: commonHeaders, // Kèm headers CORS
      body: JSON.stringify({ message: 'Lỗi khi giao tiếp với máy chủ Google Script: ' + error.message }),
    };
  }
}