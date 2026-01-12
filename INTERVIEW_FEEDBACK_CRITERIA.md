# Interview Feedback Evaluation Criteria

## Tài liệu Tiêu chí Đánh giá Phỏng vấn AI

### 1. Tổng quan

Tài liệu này mô tả các tiêu chí đánh giá chi tiết được sử dụng để đánh giá hiệu suất của ứng viên trong các buổi phỏng vấn AI. Hệ thống đánh giá dựa trên 6 tiêu chí chính và 5 hạng mục điểm số.

---

## 2. Các Tiêu chí Đánh giá Chính

### 2.1. **Length (Độ dài câu trả lời)**
**Trọng số: 25%**

Đánh giá độ đầy đủ và chi tiết của câu trả lời.

#### Tiêu chuẩn theo cấp độ:
- **Junior**: Tối thiểu 18 từ, tốt: 25-70 từ
- **Mid-level**: Tối thiểu 25 từ, tốt: 40-90 từ  
- **Senior**: Tối thiểu 35 từ, tốt: 60-120 từ

#### Thang điểm:
- **0 điểm**: Không có câu trả lời
- **4 điểm**: Quá ngắn (dưới mức tối thiểu)
- **7 điểm**: Đủ dài nhưng có thể chi tiết hơn
- **8 điểm**: Độ dài phù hợp và đầy đủ

#### Ví dụ:
- ❌ "I worked on React projects." (quá ngắn)
- ✅ "I worked on a React-based e-commerce platform where I implemented a shopping cart feature using Redux for state management. The project handled 10,000+ daily users and improved checkout conversion by 15%."

---

### 2.2. **Structure (Cấu trúc)**
**Trọng số: 20%**

Đánh giá tính tổ chức và logic của câu trả lời, đặc biệt là việc sử dụng phương pháp STAR (Situation-Task-Action-Result).

#### Dấu hiệu cấu trúc tốt:
- Có đề cập đến: `situation`, `task`, `action`, `result`
- Hoặc: `problem`, `approach`, `outcome`, `trade-off`
- Trình bày theo trình tự logic: vấn đề → giải pháp → kết quả

#### Thang điểm:
- **4 điểm**: Thiếu cấu trúc rõ ràng, trả lời rời rạc
- **10 điểm**: Có cấu trúc rõ ràng, sử dụng STAR hoặc tương tự

#### Ví dụ:
- ❌ "I fixed bugs and improved performance."
- ✅ "**Situation**: Our API was experiencing 500ms latency. **Task**: Reduce response time by 50%. **Action**: I implemented Redis caching and optimized database queries. **Result**: Latency dropped to 200ms, improving user satisfaction by 30%."

---

### 2.3. **Examples (Ví dụ cụ thể)**
**Trọng số: 20%**

Đánh giá việc sử dụng ví dụ thực tế, số liệu, và bằng chứng cụ thể.

#### Dấu hiệu có ví dụ tốt:
- Có từ khóa: `for example`, `e.g.`, `ví dụ`, `chẳng hạn`
- Có số liệu: `10%`, `1000 users`, `5 seconds`, `$50K revenue`
- Có metrics: `KPI`, `latency`, `throughput`, `ROI`, `conversion rate`

#### Thang điểm:
- **4 điểm**: Không có ví dụ hoặc số liệu cụ thể
- **10 điểm**: Có ví dụ rõ ràng với số liệu đo lường được

#### Ví dụ:
- ❌ "I improved the system performance."
- ✅ "I improved the system performance by implementing database indexing, reducing query time from 2 seconds to 200ms. This resulted in a 40% increase in page load speed and improved user retention by 15%."

---

### 2.4. **Confidence (Tự tin)**
**Trọng số: 10%**

Đánh giá mức độ tự tin, dứt khoát trong câu trả lời, tránh do dự quá mức.

#### Dấu hiệu thiếu tự tin (filler words):
- Tiếng Anh: `uh`, `um`, `maybe`, `probably`, `not sure`, `I think`, `kind of`, `sort of`
- Tiếng Việt: `ờ`, `ừm`, `chắc`, `không chắc`, `kiểu như`

#### Thang điểm:
- **4 điểm**: Quá nhiều filler words (≥4 lần) hoặc do dự rõ ràng
- **8 điểm**: Tự tin, dứt khoát, ít do dự

#### Ví dụ:
- ❌ "I think maybe I worked on React, kind of, not sure though..."
- ✅ "I worked on React for 2 years, building 5 production applications using hooks, context API, and Redux for state management."

---

### 2.5. **Keyword Match (Khớp từ khóa)**
**Trọng số: 15%**

Đánh giá việc đề cập đến các từ khóa quan trọng liên quan đến vị trí công việc.

#### Phân loại từ khóa:
- **Must-have keywords**: Bắt buộc phải có (nhân 3 điểm)
- **Nice-to-have keywords**: Tốt nếu có (nhân 1 điểm)

#### Thang điểm:
- **0 điểm**: Không có từ khóa nào
- **10 điểm**: Đề cập đầy đủ các từ khóa quan trọng

#### Ví dụ:
- **Job yêu cầu**: React, TypeScript, Redux (must-have), Jest (nice-to-have)
- ❌ "I used JavaScript and some libraries."
- ✅ "I worked extensively with React and TypeScript, using Redux for state management. I also wrote unit tests with Jest."

---

### 2.6. **Relevance (Liên quan)**
**Trọng số: 10%**

Đánh giá mức độ liên quan trực tiếp của câu trả lời với câu hỏi được đặt ra.

#### Phương pháp đánh giá:
- So sánh token/keyword giữa câu hỏi và câu trả lời
- Sử dụng Jaccard similarity để tính độ tương đồng

#### Thang điểm:
- **0 điểm**: Hoàn toàn không liên quan
- **10 điểm**: Trả lời đúng trọng tâm câu hỏi

#### Ví dụ:
- **Câu hỏi**: "How do you handle state management in large React applications?"
- ❌ "I like React because it's popular and has good documentation." (không liên quan)
- ✅ "For large React applications, I use Redux for global state and React Context for component-level state. I also implement middleware like Redux Thunk for async operations."

---

## 3. Hạng mục Điểm số (Category Scores)

### 3.1. **Clarity (Độ rõ ràng)**
Đánh giá tính rõ ràng, dễ hiểu của câu trả lời.
- **0-10 điểm**: Dựa trên tỷ lệ câu trả lời đạt ≥6 điểm trong tổng số câu hỏi

### 3.2. **Structure (Cấu trúc)**
Đánh giá tính tổ chức và logic của toàn bộ buổi phỏng vấn.
- **0-10 điểm**: Dựa trên số lượng câu trả lời có cấu trúc tốt

### 3.3. **Depth & Evidence (Độ sâu & Bằng chứng)**
Đánh giá độ sâu và việc sử dụng bằng chứng cụ thể.
- **0-10 điểm**: Điểm trung bình + bonus nếu có ví dụ cụ thể

### 3.4. **Relevance (Liên quan)**
Đánh giá mức độ liên quan tổng thể của các câu trả lời.
- **0-10 điểm**: Dựa trên điểm relevance trung bình

### 3.5. **Keyword Match (Khớp từ khóa)**
Đánh giá việc đề cập đến các từ khóa quan trọng.
- **0-10 điểm**: Dựa trên số lượng từ khóa được đề cập

---

## 4. Điểm số Tổng thể (Overall Score)

### 4.1. Công thức tính:
```
Overall Score = (Average per-question score) × 10
```

### 4.2. Thang điểm:
- **0-100 điểm**: Được tính từ điểm trung bình của tất cả câu hỏi (0-10) nhân 10

### 4.3. Recommendation (Đề xuất):
- **HIRE** (≥80 điểm): Ứng viên xuất sắc, nên tuyển
- **CONSIDER** (60-79 điểm): Ứng viên có tiềm năng, cần cân nhắc
- **REJECT** (<60 điểm): Ứng viên chưa đáp ứng yêu cầu

---

## 5. Điều chỉnh theo Loại Câu hỏi

### 5.1. **Technical Questions** (Câu hỏi kỹ thuật)
- Tăng trọng số: Keyword Match (+8%), Relevance (+5%), Examples (+3%)
- Giảm trọng số: Structure (-3%)
- Ưu tiên: Kiến thức kỹ thuật, từ khóa công nghệ, ví dụ cụ thể

### 5.2. **Behavioral Questions** (Câu hỏi hành vi)
- Tăng trọng số: Structure (+8%), Examples (+5%), Confidence (+3%)
- Giảm trọng số: Keyword Match (-4%)
- Ưu tiên: Cấu trúc STAR, ví dụ về tình huống thực tế, tự tin

### 5.3. **General Questions** (Câu hỏi chung)
- Giữ nguyên trọng số mặc định
- Cân bằng giữa tất cả các tiêu chí

---

## 6. Điều chỉnh theo Cấp độ (Seniority)

### 6.1. **Junior Level**
- Yêu cầu tối thiểu: 18 từ/câu trả lời
- Tập trung: Kiến thức cơ bản, khả năng học hỏi
- Kỳ vọng: Hiểu biết cơ bản, sẵn sàng học hỏi

### 6.2. **Mid-level**
- Yêu cầu tối thiểu: 25 từ/câu trả lời
- Tập trung: Kinh nghiệm thực tế, giải quyết vấn đề
- Kỳ vọng: Có kinh nghiệm, có thể làm việc độc lập

### 6.3. **Senior Level**
- Yêu cầu tối thiểu: 35 từ/câu trả lời
- Tập trung: Kiến thức sâu, leadership, architecture
- Kỳ vọng: Có thể thiết kế hệ thống, mentor team

---

## 7. Feedback Format

### 7.1. Per-Question Feedback
Mỗi câu hỏi sẽ nhận được:
- **Score**: 0-10 điểm
- **Feedback**: Gợi ý cụ thể để cải thiện

#### Ví dụ feedback:
- "Answer is very short; add more detail."
- "Try a clearer structure (problem → action → result)."
- "Add a concrete example or metric."
- "Reduce hedging; be more confident and specific."
- "Try to address the role keywords more explicitly."
- "Make sure the answer directly addresses the question."

### 7.2. Overall Summary
Tổng kết toàn bộ buổi phỏng vấn:
- **Strengths**: Điểm mạnh của ứng viên
- **Areas for Improvement**: Điểm cần cải thiện
- **Category Scores**: Điểm chi tiết theo từng hạng mục

---

## 8. Best Practices cho Ứng viên

### 8.1. Chuẩn bị trước phỏng vấn:
- Nghiên cứu kỹ job description và yêu cầu
- Chuẩn bị ví dụ cụ thể về các dự án đã làm
- Luyện tập phương pháp STAR

### 8.2. Trong khi phỏng vấn:
- Trả lời đầy đủ, chi tiết (ít nhất 25-40 từ)
- Sử dụng cấu trúc rõ ràng (STAR)
- Đưa ra ví dụ cụ thể với số liệu
- Tự tin, tránh do dự quá mức
- Đề cập đến các từ khóa quan trọng
- Trả lời đúng trọng tâm câu hỏi

### 8.3. Sau phỏng vấn:
- Xem lại feedback để cải thiện
- Luyện tập các điểm yếu được chỉ ra
- Chuẩn bị tốt hơn cho lần sau

---

## 9. Lưu ý Kỹ thuật

### 9.1. Off-topic Penalty
Nếu câu trả lời:
- Có độ liên quan thấp (<0.08)
- Nhưng lại dài (≥40 từ)
- → Điểm sẽ bị giới hạn tối đa 5/10 để tránh thưởng cho câu trả lời lan man

### 9.2. Normalization
Tất cả điểm số được normalize để đảm bảo:
- Tổng trọng số = 1.0
- Điểm cuối cùng nằm trong khoảng 0-10 (per question) hoặc 0-100 (overall)

### 9.3. Language Support
Hệ thống hỗ trợ đánh giá bằng:
- Tiếng Anh (en)
- Tiếng Việt (vi)

---

## 10. Kết luận

Tài liệu này cung cấp framework đánh giá toàn diện và công bằng cho các buổi phỏng vấn AI. Các tiêu chí được thiết kế để:
- Đảm bảo tính nhất quán trong đánh giá
- Cung cấp feedback hữu ích cho ứng viên
- Hỗ trợ recruiter trong quyết định tuyển dụng

**Phiên bản**: 1.0  
**Cập nhật lần cuối**: 2024


