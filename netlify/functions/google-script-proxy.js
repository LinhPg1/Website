// Đường dẫn: netlify/functions/google-script-proxy.js

/**
 * Handler của Netlify Function, hoạt động như một proxy.
 * Nó nhận một yêu cầu POST từ frontend, chuyển tiếp nó đến Google Apps Script,
 * và trả về phản hồi của Google Script cho frontend.
 *
 * @param {object} event - Đối tượng sự kiện chứa thông tin về yêu cầu (request).
 * @param {object} context - Đối tượng chứa thông tin ngữ cảnh.
 */
export async function handler(event, context) {
  // 1. Lấy URL thật của Google Apps Script từ biến môi trường trên Netlify.
  //    Đây là cách làm bảo mật, tránh lộ URL ở phía client hoặc trong code repository.
  const REAL_GOOGLE_SHEET_URL = process.env.REAL_GOOGLE_SHEET_URL;

  // 2. Kiểm tra xem biến môi trường đã được cấu hình hay chưa.
  if (!REAL_GOOGLE_SHEET_URL) {
    console.error("Lỗi: Biến môi trường REAL_GOOGLE_SHEET_URL chưa được thiết lập.");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Lỗi cấu hình phía máy chủ: URL của Google Script chưa được định nghĩa." }),
    };
  }

  // 3. Chỉ cho phép các yêu cầu sử dụng phương thức POST.
  //    Điều này ngăn chặn các truy cập không mong muốn bằng các phương thức khác.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // 405 Method Not Allowed
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ message: 'Phương thức không hợp lệ. Chỉ chấp nhận POST.' }),
    };
  }

  try {
    // 4. Gửi yêu cầu fetch đến URL thật của Google Apps Script.
    //    - method: 'POST'
    //    - headers: 'Content-Type' phải là 'application/json'.
    //    - body: Chuyển tiếp nguyên vẹn nội dung (payload) từ yêu cầu của client.
    const response = await fetch(REAL_GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: event.body,
    });

    // 5. Xử lý phản hồi từ Google Apps Script.
    //    Dù thành công hay thất bại, Google Script vẫn trả về JSON.
    const data = await response.json();

    // Nếu phản hồi từ Google không phải là OK (ví dụ: lỗi 4xx, 5xx từ Google Script),
    // trả về lỗi đó cho client.
    if (!response.ok) {
        console.error("Lỗi từ Google Apps Script:", data);
        return {
            statusCode: response.status,
            body: JSON.stringify(data),
        };
    }

    // 6. Trả về kết quả thành công cho client.
    //    - statusCode: 200 OK
    //    - headers: Quan trọng nhất là 'Access-Control-Allow-Origin' để giải quyết vấn đề CORS.
    //    - body: Dữ liệu JSON đã được stringify.
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Cho phép mọi domain truy cập
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

  } catch (error) {
    // 7. Bắt các lỗi xảy ra trong quá trình fetch (ví dụ: lỗi mạng, DNS).
    console.error('Lỗi trong proxy function:', error);
    return {
      statusCode: 502, // 502 Bad Gateway
      body: JSON.stringify({ message: 'Lỗi khi giao tiếp với máy chủ Google Script: ' + error.message }),
    };
  }
} 