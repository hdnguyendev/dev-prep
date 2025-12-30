# Membership System Setup Guide

## Overview

Hệ thống Membership (VIP) đã được implement với tích hợp PayOS payment gateway.

## Local Development Setup

### 1. PayOS Webhook cho Localhost

PayOS **không thể** gửi webhook trực tiếp đến `localhost`. Có 2 cách để test:

#### Cách 1: Sử dụng ngrok (Khuyến nghị)

1. **Cài đặt ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Hoặc download từ https://ngrok.com/
   ```

2. **Chạy ngrok để expose local server:**
   ```bash
   ngrok http 9999
   # Sẽ tạo URL như: https://abc123.ngrok.io
   ```

3. **Cấu hình PayOS Webhook URL:**
   - Vào PayOS Dashboard
   - Set webhook URL: `https://abc123.ngrok.io/api/membership/payment/webhook`
   - Lưu ý: Mỗi lần restart ngrok, URL sẽ thay đổi

4. **Cấu hình environment variable:**
   ```bash
   PAYOS_WEBHOOK_URL=https://abc123.ngrok.io/api/membership/payment/webhook
   ```

#### Cách 2: Manual Webhook Testing (Development only)

Sử dụng endpoint manual để test webhook processing:

```bash
# Sau khi tạo payment transaction, test webhook manually
POST http://localhost:9999/api/membership/payment/{orderCode}/manual-webhook
Content-Type: application/json

{
  "webhookData": {
    "code": "00",
    "desc": "Success",
    "data": {
      "orderCode": 123456789,
      "status": "PAID"  // hoặc "CANCELLED"
    }
  }
}
```

**Lưu ý:** Endpoint này chỉ hoạt động trong development mode (`NODE_ENV !== "production"`).

### 2. Environment Variables

Thêm vào `.env` hoặc environment:

```bash
# PayOS Configuration
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
PAYOS_BASE_URL=https://api.payos.vn  # hoặc sandbox URL nếu có
PAYOS_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/membership/payment/webhook

# App Base URL (for payment return/cancel URLs)
APP_BASE_URL=http://localhost:5173  # Frontend URL
```

### 3. Seed Membership Plans

Chạy script để tạo default membership plans:

```bash
cd server
bun run scripts/seedMembershipPlans.ts
```

Sẽ tạo:
- FREE Candidate Plan
- VIP Candidate Plan (299,000 VND/30 days)
- FREE Recruiter Plan
- VIP Recruiter Plan (999,000 VND/30 days)

## Production Setup

### 1. PayOS Webhook Configuration

1. **Set webhook URL trong PayOS Dashboard:**
   ```
   https://your-production-domain.com/api/membership/payment/webhook
   ```

2. **Verify webhook endpoint:**
   - PayOS sẽ gửi test webhook để verify
   - Endpoint phải return `200 OK` với `{ success: true }`

### 2. Security

- **Checksum Verification:** Webhook handler tự động verify PayOS checksum
- **Idempotency:** Prevent duplicate processing bằng `orderCode`
- **HTTPS Required:** Production webhook URL phải dùng HTTPS

## Testing Flow

### 1. Purchase Membership

```bash
POST /api/membership/purchase
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "planId": "vip-candidate-plan-id"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "transactionId": "...",
    "paymentUrl": "https://payos.vn/checkout/...",
    "orderCode": "123456789"
  }
}
```

### 2. Check Payment Status

```bash
GET /api/membership/payment/{orderCode}/status
```

### 3. Webhook Processing

- **Automatic:** PayOS gửi webhook khi payment completed
- **Manual (Dev):** Sử dụng `/api/membership/payment/{orderCode}/manual-webhook`

## API Endpoints

### Membership Management

- `GET /api/membership/plans?role=CANDIDATE|RECRUITER` - Lấy danh sách plans
- `GET /api/membership/status` - Kiểm tra membership status của user hiện tại
- `POST /api/membership/purchase` - Mua membership (tạo PayOS payment link)

### Payment

- `POST /api/membership/payment/webhook` - PayOS webhook handler
- `GET /api/membership/payment/:orderCode/status` - Kiểm tra payment status
- `POST /api/membership/payment/:orderCode/manual-webhook` - Manual webhook trigger (dev only)

## Troubleshooting

### Webhook không nhận được

1. **Kiểm tra ngrok URL:** Đảm bảo ngrok đang chạy và URL đúng
2. **Kiểm tra PayOS Dashboard:** Verify webhook URL đã được set
3. **Check logs:** Xem server logs để debug
4. **Use manual endpoint:** Test với manual webhook endpoint trước

### Payment link không tạo được

1. **Kiểm tra PayOS credentials:** `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`
2. **Check PayOS API status:** Verify PayOS service đang hoạt động
3. **Check logs:** Xem error logs trong console

### Membership không activate sau payment

1. **Kiểm tra webhook:** Verify webhook đã được gửi và processed
2. **Check transaction status:** Xem `PaymentTransaction.status`
3. **Check membership:** Verify `UserMembership` đã được tạo
4. **Check logs:** Xem error logs trong webhook handler

## Notes

- **FREE Membership:** Tự động được tạo khi user register
- **VIP Membership:** Chỉ activate sau khi payment completed
- **Expiration:** Membership tự động expire dựa trên `endDate`
- **Feature Gating:** Tự động enforce limits dựa trên membership plan

