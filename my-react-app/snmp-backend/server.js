// server.js
const express = require('express');
const snmp = require('net-snmp');
const cors = require('cors'); // Use cors for easy development

const app = express();
const port = 3001; // Cổng cho backend service

// Enable CORS for all routes
app.use(cors());

app.get('/api/device-status', (req, res) => {
    // !!! QUAN TRỌNG: Thay đổi các giá trị này cho phù hợp với hệ thống của bạn
    // Đây là IP của thiết bị bạn muốn giám sát (ví dụ: router, switch...)
    const deviceIp = "192.168.1.1"; 
    // Đây là community string bạn đã cấu hình trên thiết bị đó
    const community = "public"; 

    // OID ví dụ: sysDescr (mô tả hệ thống) và sysUpTime (thời gian hoạt động)
    // Bạn có thể tìm thêm các OID khác để lấy thông tin mình muốn.
    const oids = ["1.3.6.1.2.1.1.1.0", "1.3.6.1.2.1.1.3.0"];

    // Sử dụng phiên bản 2c là phổ biến nhất
    const session = snmp.createSession(deviceIp, community, { version: snmp.Version2c });

    session.get(oids, (error, varbinds) => {
        if (error) {
            console.error("Lỗi SNMP:", error.toString());
            // Gửi lỗi rõ ràng về cho client
            res.status(500).json({ error: `Không thể kết nối SNMP đến ${deviceIp}. Lỗi: ${error.message}` });
        } else {
            const data = {};
            for (const varbind of varbinds) {
                if (snmp.isVarbindError(varbind)) {
                    const errorMessage = snmp.varbindError(varbind);
                    console.error("Lỗi Varbind:", errorMessage);
                    // Nếu có lỗi ở một OID cụ thể
                    data[varbind.oid] = errorMessage;
                } else {
                    // Xử lý dữ liệu trả về
                    if (varbind.oid === oids[0]) {
                        data.description = varbind.value.toString();
                    }
                    if (varbind.oid === oids[1]) {
                        // uptime là timeticks (trăm phần giây), chuyển thành giây cho dễ đọc
                        data.uptimeInSeconds = Math.floor(varbind.value / 100); 
                    }
                }
            }
            res.json(data);
        }
        session.close();
    });
});

app.listen(port, () => {
    console.log(`Backend SNMP đang chạy tại http://localhost:${port}`);
    console.log('Truy cập http://localhost:3001/api/device-status để kiểm tra');
}); 