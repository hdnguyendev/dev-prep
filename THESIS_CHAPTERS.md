# LUẬN VĂN TỐT NGHIỆP
## Đề tài: Hệ thống ứng tuyển việc làm với tính năng phỏng vấn AI
## DevPrep - AI-Powered Job Application Platform

---

# CHƯƠNG 1: GIỚI THIỆU

## 1.1. Đặt vấn đề

### 1.1.1. Bối cảnh thực tế

Trong bối cảnh nền kinh tế số phát triển mạnh mẽ, nhu cầu tuyển dụng nhân sự chất lượng cao ngày càng trở nên cấp thiết đối với các doanh nghiệp. Tuy nhiên, quy trình tuyển dụng truyền thống đang gặp phải nhiều thách thức:

- **Thời gian tuyển dụng kéo dài**: Theo nghiên cứu của LinkedIn, trung bình một quy trình tuyển dụng mất từ 30-45 ngày, trong đó giai đoạn sàng lọc ban đầu chiếm đến 70% thời gian của nhà tuyển dụng.

- **Thiếu tính nhất quán trong đánh giá**: Mỗi nhà tuyển dụng có tiêu chí và cách đánh giá khác nhau, dẫn đến sự không công bằng và thiếu khách quan trong quá trình tuyển dụng.

- **Hạn chế về khả năng mở rộng**: Khi cần tuyển dụng số lượng lớn ứng viên, việc sắp xếp và tiến hành phỏng vấn trở nên khó khăn, tốn kém về thời gian và chi phí.

- **Xung đột lịch trình**: Ứng viên và nhà tuyển dụng thường gặp khó khăn trong việc sắp xếp thời gian phỏng vấn phù hợp cho cả hai bên.

- **Chi phí tuyển dụng cao**: Theo báo cáo của SHRM, chi phí trung bình để tuyển một nhân viên mới có thể lên tới $4,700, trong đó chi phí cho giai đoạn phỏng vấn chiếm tỷ trọng lớn.

### 1.1.2. Vai trò của công nghệ AI trong tuyển dụng

Trí tuệ nhân tạo (AI) đang ngày càng được ứng dụng rộng rãi trong nhiều lĩnh vực, và tuyển dụng không phải là ngoại lệ. Các công nghệ AI hiện đại có thể:

- **Tự động hóa quy trình sàng lọc**: Sử dụng AI để phân tích CV và đánh giá ứng viên ban đầu, giúp tiết kiệm thời gian cho nhà tuyển dụng.

- **Phỏng vấn thông minh**: AI có thể tiến hành phỏng vấn ứng viên thông qua giọng nói, đánh giá kỹ năng giao tiếp, kiến thức chuyên môn và phù hợp văn hóa.

- **Phân tích dữ liệu ứng viên**: AI có thể phân tích transcript phỏng vấn, đưa ra điểm số và đánh giá chi tiết về từng ứng viên một cách khách quan.

- **Cải thiện trải nghiệm ứng viên**: Ứng viên có thể tham gia phỏng vấn bất cứ lúc nào, không bị ràng buộc bởi lịch trình của nhà tuyển dụng.

### 1.1.3. Vấn đề nghiên cứu

Mặc dù đã có nhiều nền tảng tuyển dụng trực tuyến, nhưng hầu hết các hệ thống hiện tại vẫn:

- Chỉ tập trung vào việc đăng tin tuyển dụng và quản lý CV, chưa tích hợp sâu tính năng phỏng vấn AI.

- Sử dụng phỏng vấn video đơn giản (chỉ ghi lại video), thiếu tính tương tác và phân tích thông minh.

- Không có hệ thống đánh giá tự động dựa trên AI, vẫn phụ thuộc vào đánh giá thủ công của nhà tuyển dụng.

- Thiếu tính năng phân tích chi tiết và đưa ra gợi ý cải thiện cho ứng viên.

Do đó, việc nghiên cứu và phát triển một hệ thống ứng tuyển việc làm tích hợp tính năng phỏng vấn AI thông minh là một vấn đề có ý nghĩa thực tiễn cao.

## 1.2. Mục tiêu nghiên cứu

### 1.2.1. Mục tiêu tổng quát

Nghiên cứu và xây dựng hệ thống ứng tuyển việc làm **DevPrep** với tính năng phỏng vấn AI thông minh, nhằm:

- Tự động hóa quy trình sàng lọc và phỏng vấn ứng viên ban đầu
- Cải thiện hiệu quả và chất lượng tuyển dụng
- Nâng cao trải nghiệm cho cả ứng viên và nhà tuyển dụng
- Giảm thiểu chi phí và thời gian tuyển dụng

### 1.2.2. Mục tiêu cụ thể

1. **Phân tích và thiết kế hệ thống**:
   - Phân tích yêu cầu của các bên liên quan (ứng viên, nhà tuyển dụng, quản trị viên)
   - Thiết kế kiến trúc hệ thống với khả năng mở rộng cao
   - Thiết kế cơ sở dữ liệu để lưu trữ thông tin ứng viên, công việc, và kết quả phỏng vấn

2. **Xây dựng tính năng phỏng vấn AI**:
   - Tích hợp công nghệ AI để tạo cuộc phỏng vấn giọng nói thời gian thực
   - Xây dựng hệ thống phân tích transcript tự động
   - Phát triển thuật toán đánh giá và chấm điểm ứng viên
   - Tạo hệ thống đưa ra phản hồi và gợi ý cải thiện

3. **Xây dựng quy trình ứng tuyển hoàn chỉnh**:
   - Hệ thống đăng tin tuyển dụng và tìm kiếm việc làm
   - Quy trình nộp đơn ứng tuyển với upload CV
   - Quản lý trạng thái ứng tuyển tự động
   - Hệ thống thông báo và email tự động

4. **Đánh giá và kiểm thử hệ thống**:
   - Kiểm thử chức năng và hiệu năng
   - Đánh giá độ chính xác của AI trong phân tích phỏng vấn
   - Thu thập phản hồi từ người dùng thử nghiệm
   - Đo lường hiệu quả cải thiện so với quy trình truyền thống

## 1.3. Đối tượng và phạm vi nghiên cứu

### 1.3.1. Đối tượng nghiên cứu

- **Ứng viên (Candidates)**: Người tìm việc sử dụng hệ thống để tìm kiếm và ứng tuyển vào các vị trí công việc.

- **Nhà tuyển dụng (Recruiters)**: Người đăng tin tuyển dụng, quản lý ứng viên, và sử dụng kết quả phân tích AI để đưa ra quyết định tuyển dụng.

- **Quản trị viên (Administrators)**: Người quản lý hệ thống, giám sát hoạt động và đảm bảo hệ thống vận hành ổn định.

### 1.3.2. Phạm vi nghiên cứu

**Về mặt chức năng**:
- Hệ thống tập trung vào quy trình ứng tuyển và phỏng vấn AI cho các vị trí công việc trong lĩnh vực công nghệ thông tin (IT).
- Tính năng phỏng vấn AI hỗ trợ tiếng Anh, tập trung vào đánh giá kỹ năng kỹ thuật và giao tiếp.
- Hệ thống hỗ trợ các loại phỏng vấn: AI Video, AI Audio, và Coding Test.

**Về mặt công nghệ**:
- Frontend: React với TypeScript, Vite
- Backend: Hono framework trên Bun runtime
- Database: PostgreSQL với Prisma ORM
- AI Services: Vapi.ai, GPT-4, Google Gemini, Deepgram, 11Labs
- Infrastructure: Cloudflare Workers và Cloudflare Pages
- Authentication: Clerk

**Về mặt thời gian**:
- Nghiên cứu và phát triển trong khuôn khổ đồ án tốt nghiệp
- Hệ thống được thiết kế và triển khai để có thể mở rộng và phát triển tiếp trong tương lai

## 1.4. Ý nghĩa khoa học và thực tiễn

### 1.4.1. Ý nghĩa khoa học

- **Ứng dụng AI trong tuyển dụng**: Nghiên cứu cách tích hợp các công nghệ AI hiện đại (NLP, Speech Recognition, Voice Synthesis) vào quy trình tuyển dụng thực tế.

- **Kiến trúc hệ thống phân tán**: Áp dụng kiến trúc serverless và microservices để xây dựng hệ thống có khả năng mở rộng cao.

- **Phân tích dữ liệu phỏng vấn**: Nghiên cứu phương pháp phân tích transcript phỏng vấn bằng AI để đánh giá ứng viên một cách khách quan.

- **Tối ưu hóa quy trình**: Áp dụng các nguyên lý tự động hóa và tối ưu hóa để cải thiện hiệu quả quy trình tuyển dụng.

### 1.4.2. Ý nghĩa thực tiễn

**Đối với doanh nghiệp**:
- Giảm 70% thời gian sàng lọc ứng viên ban đầu
- Tiết kiệm chi phí tuyển dụng nhờ tự động hóa
- Cải thiện chất lượng tuyển dụng nhờ đánh giá khách quan và nhất quán
- Tăng khả năng mở rộng quy mô tuyển dụng

**Đối với ứng viên**:
- Trải nghiệm ứng tuyển thuận tiện và nhanh chóng
- Có thể tham gia phỏng vấn 24/7, không bị ràng buộc lịch trình
- Nhận được phản hồi chi tiết và gợi ý cải thiện từ AI
- Tăng cơ hội được đánh giá công bằng và khách quan

**Đối với nhà tuyển dụng**:
- Tiết kiệm thời gian và công sức trong giai đoạn sàng lọc
- Nhận được đánh giá chi tiết và điểm số khách quan từ AI
- Quản lý ứng viên hiệu quả hơn với dashboard trực quan
- Đưa ra quyết định tuyển dụng dựa trên dữ liệu và phân tích

## 1.5. Cấu trúc luận văn

Luận văn được tổ chức thành các chương như sau:

- **Chương 1: Giới thiệu**: Đặt vấn đề, mục tiêu nghiên cứu, đối tượng và phạm vi nghiên cứu, ý nghĩa khoa học và thực tiễn.

- **Chương 2: Cơ sở lý thuyết và công nghệ**: Trình bày các kiến thức nền tảng về công nghệ sử dụng, các nghiên cứu liên quan, và phương pháp tiếp cận.

- **Chương 3: Phân tích và thiết kế hệ thống**: Phân tích yêu cầu, thiết kế kiến trúc hệ thống, thiết kế cơ sở dữ liệu, và thiết kế các module chính.

- **Chương 4: Cài đặt và triển khai**: Mô tả quá trình cài đặt, triển khai các tính năng chính, và tích hợp các dịch vụ AI.

- **Chương 5: Kiểm thử và đánh giá**: Trình bày các phương pháp kiểm thử, kết quả đánh giá, và so sánh với các hệ thống tương tự.

- **Kết luận và hướng phát triển**: Tóm tắt kết quả đạt được, các đóng góp chính, và đề xuất hướng phát triển trong tương lai.

---

# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ

## 2.1. Tổng quan về hệ thống ứng tuyển việc làm

### 2.1.1. Khái niệm và đặc điểm

Hệ thống ứng tuyển việc làm (Job Application System) là một nền tảng công nghệ cho phép kết nối giữa người tìm việc và nhà tuyển dụng thông qua môi trường số. Hệ thống này thường bao gồm các thành phần chính:

- **Quản lý tin tuyển dụng**: Cho phép nhà tuyển dụng đăng tin, chỉnh sửa và quản lý các vị trí tuyển dụng.

- **Tìm kiếm và lọc việc làm**: Ứng viên có thể tìm kiếm việc làm theo nhiều tiêu chí như vị trí, mức lương, kỹ năng, địa điểm.

- **Quản lý hồ sơ ứng viên**: Ứng viên có thể tạo và quản lý CV, portfolio, và thông tin cá nhân.

- **Quy trình ứng tuyển**: Cho phép ứng viên nộp đơn ứng tuyển và theo dõi trạng thái.

- **Quản lý ứng viên**: Nhà tuyển dụng có thể xem, đánh giá và quản lý các ứng viên đã ứng tuyển.

### 2.1.2. Các hệ thống hiện có

**LinkedIn**: Nền tảng mạng xã hội nghề nghiệp lớn nhất thế giới, tích hợp tính năng tìm việc và ứng tuyển. Tuy nhiên, LinkedIn chủ yếu tập trung vào networking và chưa có tính năng phỏng vấn AI tích hợp sâu.

**Indeed**: Nền tảng tìm việc lớn với khả năng tìm kiếm mạnh mẽ. Indeed có tính năng phỏng vấn video đơn giản nhưng thiếu phân tích AI tự động.

**Glassdoor**: Kết hợp tìm việc với đánh giá công ty. Glassdoor cung cấp thông tin về mức lương và văn hóa công ty nhưng không có tính năng phỏng vấn AI.

**HireVue**: Chuyên về phỏng vấn video với một số tính năng AI, nhưng tập trung vào enterprise và chi phí cao.

**Pymetrics**: Sử dụng AI để đánh giá ứng viên thông qua các trò chơi và bài test, nhưng không có tính năng phỏng vấn giọng nói.

### 2.1.3. Xu hướng phát triển

- **Tự động hóa quy trình**: Ngày càng nhiều hệ thống tích hợp tự động hóa để giảm thiểu công việc thủ công.

- **Ứng dụng AI**: AI được sử dụng để sàng lọc CV, đánh giá ứng viên, và thậm chí tiến hành phỏng vấn.

- **Trải nghiệm người dùng**: Các hệ thống mới tập trung vào việc cải thiện trải nghiệm cho cả ứng viên và nhà tuyển dụng.

- **Mobile-first**: Nhiều hệ thống được thiết kế ưu tiên cho thiết bị di động.

- **Tích hợp đa nền tảng**: Kết nối với các hệ thống ATS (Applicant Tracking System) và HRM (Human Resource Management) khác.

## 2.2. Công nghệ AI trong phỏng vấn

### 2.2.1. Natural Language Processing (NLP)

**Khái niệm**: NLP là một nhánh của AI tập trung vào việc giúp máy tính hiểu, diễn giải và tạo ra ngôn ngữ tự nhiên của con người.

**Ứng dụng trong phỏng vấn**:
- **Phân tích câu trả lời**: NLP có thể phân tích câu trả lời của ứng viên để đánh giá mức độ phù hợp, độ sâu của kiến thức, và kỹ năng giao tiếp.

- **Tạo câu hỏi**: AI có thể tạo ra các câu hỏi phỏng vấn phù hợp dựa trên yêu cầu công việc và kỹ năng cần thiết.

- **Đánh giá cảm xúc**: Phân tích tone và cảm xúc trong câu trả lời để đánh giá thái độ và sự tự tin của ứng viên.

**Công nghệ sử dụng trong DevPrep**:
- **GPT-4 (OpenAI)**: Mô hình ngôn ngữ lớn được sử dụng để tạo phản hồi tự nhiên của người phỏng vấn AI, đảm bảo cuộc hội thoại tự nhiên và ngữ cảnh.

- **Google Gemini**: Mô hình AI đa phương thức được sử dụng để phân tích transcript phỏng vấn và tạo đánh giá chi tiết.

### 2.2.2. Speech Recognition (Nhận dạng giọng nói)

**Khái niệm**: Speech Recognition là công nghệ chuyển đổi giọng nói thành văn bản.

**Ứng dụng trong phỏng vấn**:
- **Ghi lại cuộc phỏng vấn**: Chuyển đổi toàn bộ cuộc phỏng vấn thành văn bản để lưu trữ và phân tích sau này.

- **Phân tích thời gian thực**: Nhận dạng giọng nói trong thời gian thực để AI có thể phản hồi ngay lập tức.

- **Đa ngôn ngữ**: Hỗ trợ nhiều ngôn ngữ để mở rộng phạm vi ứng dụng.

**Công nghệ sử dụng trong DevPrep**:
- **Deepgram**: Dịch vụ nhận dạng giọng nói với độ chính xác cao, hỗ trợ real-time transcription và nhiều ngôn ngữ. Sử dụng model "nova-2" cho độ chính xác tối ưu.

### 2.2.3. Text-to-Speech (Tổng hợp giọng nói)

**Khái niệm**: Text-to-Speech là công nghệ chuyển đổi văn bản thành giọng nói tự nhiên.

**Ứng dụng trong phỏng vấn**:
- **Giọng nói AI tự nhiên**: Tạo ra giọng nói của người phỏng vấn AI nghe tự nhiên và dễ chịu.

- **Đa dạng giọng nói**: Có thể chọn giọng nam/nữ, accent khác nhau để phù hợp với ngữ cảnh.

- **Điều chỉnh tốc độ và tone**: Tùy chỉnh tốc độ nói và tone để phù hợp với từng tình huống phỏng vấn.

**Công nghệ sử dụng trong DevPrep**:
- **11Labs**: Dịch vụ tổng hợp giọng nói với chất lượng cao, sử dụng voice "sarah" với các tham số tối ưu (stability: 0.4, similarityBoost: 0.8, speed: 0.9).

### 2.2.4. Real-time Voice Communication

**Khái niệm**: Giao tiếp giọng nói thời gian thực cho phép hai bên nói chuyện với nhau qua internet mà không có độ trễ đáng kể.

**Công nghệ WebRTC**: 
- WebRTC (Web Real-Time Communication) là một công nghệ mã nguồn mở cho phép giao tiếp real-time qua trình duyệt web.

- WebRTC sử dụng peer-to-peer connection để giảm độ trễ và cải thiện chất lượng.

**Công nghệ sử dụng trong DevPrep**:
- **Vapi.ai**: Nền tảng cung cấp SDK để tích hợp AI voice assistant vào ứng dụng web/mobile. Vapi.ai xử lý toàn bộ pipeline từ WebRTC, speech recognition, AI processing đến voice synthesis trong một SDK thống nhất.

### 2.2.5. AI Analysis và Scoring

**Phân tích Transcript**:
- Sau khi phỏng vấn kết thúc, toàn bộ transcript được gửi đến AI để phân tích.

- AI đánh giá ứng viên dựa trên nhiều tiêu chí:
  - **Kỹ năng kỹ thuật**: Kiến thức về công nghệ, kỹ năng lập trình, kinh nghiệm làm việc.
  - **Kỹ năng giao tiếp**: Khả năng diễn đạt ý tưởng, cấu trúc câu trả lời, sự tự tin.
  - **Phù hợp văn hóa**: Thái độ, giá trị, và sự phù hợp với công ty.
  - **Kinh nghiệm**: Số năm kinh nghiệm, các dự án đã làm, thành tựu đạt được.

**Scoring System**:
- Mỗi câu hỏi được chấm điểm từ 0-10 hoặc 0-100.

- Điểm tổng thể được tính dựa trên trung bình có trọng số của tất cả các câu hỏi.

- AI đưa ra recommendation: "Recommend", "Consider", hoặc "Reject".

**Công nghệ sử dụng trong DevPrep**:
- **Google Gemini 2.5 Flash**: Mô hình AI đa phương thức mới nhất của Google, được tối ưu cho tốc độ và độ chính xác. Hệ thống có cơ chế fallback tự động sang các phiên bản cũ hơn nếu phiên bản mới không khả dụng.

## 2.3. Công nghệ phát triển hệ thống

### 2.3.1. Frontend Technologies

**React**:
- React là một thư viện JavaScript mã nguồn mở được phát triển bởi Facebook để xây dựng giao diện người dùng.

- **Ưu điểm**:
  - Component-based architecture giúp code dễ bảo trì và tái sử dụng.
  - Virtual DOM giúp cải thiện hiệu năng.
  - Ecosystem phong phú với nhiều thư viện hỗ trợ.
  - Cộng đồng lớn và tài liệu đầy đủ.

**TypeScript**:
- TypeScript là một superset của JavaScript với hệ thống kiểu tĩnh.

- **Ưu điểm**:
  - Phát hiện lỗi sớm trong quá trình phát triển.
  - Code dễ đọc và bảo trì hơn.
  - Hỗ trợ tốt cho IDE với autocomplete và refactoring.
  - Tăng độ tin cậy của code.

**Vite**:
- Vite là một build tool hiện đại cho frontend development.

- **Ưu điểm**:
  - Hot Module Replacement (HMR) cực nhanh.
  - Build time nhanh hơn so với Webpack.
  - Hỗ trợ native ES modules.
  - Cấu hình đơn giản.

### 2.3.2. Backend Technologies

**Hono Framework**:
- Hono là một web framework nhỏ gọn và nhanh cho JavaScript/TypeScript.

- **Ưu điểm**:
  - Hiệu năng cao, đặc biệt trên edge runtime.
  - API đơn giản và dễ học.
  - Hỗ trợ tốt cho TypeScript.
  - Tương thích với nhiều runtime (Node.js, Bun, Cloudflare Workers, Deno).

**Bun Runtime**:
- Bun là một JavaScript runtime mới được viết bằng Zig, nhanh hơn Node.js.

- **Ưu điểm**:
  - Tốc độ thực thi nhanh hơn Node.js đáng kể.
  - Built-in bundler, test runner, và package manager.
  - Tương thích với Node.js APIs.
  - Hỗ trợ TypeScript native.

**Prisma ORM**:
- Prisma là một ORM (Object-Relational Mapping) hiện đại cho TypeScript và Node.js.

- **Ưu điểm**:
  - Type-safe database access.
  - Schema migration tự động.
  - Query builder mạnh mẽ và dễ sử dụng.
  - Hỗ trợ nhiều database (PostgreSQL, MySQL, SQLite, MongoDB).

**PostgreSQL**:
- PostgreSQL là một relational database management system mã nguồn mở.

- **Ưu điểm**:
  - ACID compliance đảm bảo tính nhất quán dữ liệu.
  - Hỗ trợ nhiều kiểu dữ liệu phức tạp (JSON, arrays, etc.).
  - Extensibility cao với nhiều extensions.
  - Performance tốt cho cả read và write operations.

### 2.3.3. Infrastructure và Deployment

**Cloudflare Workers**:
- Cloudflare Workers là một serverless platform cho phép chạy code ở edge locations trên toàn thế giới.

- **Ưu điểm**:
  - Low latency nhờ edge computing.
  - Auto-scaling tự động.
  - Pay-per-use pricing model.
  - Global distribution.

**Cloudflare Pages**:
- Cloudflare Pages là một platform để deploy static sites và JAMstack applications.

- **Ưu điểm**:
  - Deploy tự động từ Git.
  - CDN toàn cầu.
  - Preview deployments cho mỗi PR.
  - Tích hợp tốt với Cloudflare Workers.

**Cloudflare R2**:
- Cloudflare R2 là object storage tương tự S3 nhưng không tính phí egress.

- **Ưu điểm**:
  - Không tính phí egress (data transfer out).
  - Tương thích với S3 API.
  - Tích hợp tốt với Cloudflare ecosystem.
  - Giá cả cạnh tranh.

### 2.3.4. Authentication và Security

**Clerk**:
- Clerk là một authentication service cung cấp các tính năng xác thực và quản lý người dùng.

- **Ưu điểm**:
  - Setup nhanh chóng với vài dòng code.
  - Hỗ trợ nhiều phương thức đăng nhập (email, social, etc.).
  - Built-in user management UI.
  - Security best practices được áp dụng tự động.

**JWT (JSON Web Tokens)**:
- JWT được sử dụng để xác thực API requests.

- **Ưu điểm**:
  - Stateless authentication.
  - Có thể chứa thông tin người dùng.
  - Dễ dàng verify và validate.

## 2.4. Kiến trúc hệ thống

### 2.4.1. Monorepo Architecture

**Khái niệm**: Monorepo là một cách tổ chức code nơi nhiều projects được lưu trữ trong cùng một repository.

**Cấu trúc DevPrep**:
```
dev-prep/
├── client/          # Frontend React application
├── server/          # Backend Hono API
├── shared/          # Shared TypeScript types
└── package.json     # Root workspace configuration
```

**Ưu điểm**:
- **Type Safety**: Shared types đảm bảo type consistency giữa frontend và backend.
- **Code Reuse**: Có thể chia sẻ utilities và constants.
- **Easier Refactoring**: Thay đổi types được propagate tự động.
- **Single Source of Truth**: Một nơi quản lý toàn bộ codebase.

### 2.4.2. Serverless Architecture

**Khái niệm**: Serverless architecture là một mô hình cloud computing nơi cloud provider quản lý server và tự động allocate resources khi cần.

**Kiến trúc DevPrep**:
- **Frontend**: Deploy trên Cloudflare Pages (static hosting).
- **Backend**: Deploy trên Cloudflare Workers (serverless functions).
- **Database**: PostgreSQL trên Neon (managed database với connection pooling).
- **Storage**: Cloudflare R2 cho file uploads.

**Ưu điểm**:
- **Auto-scaling**: Tự động scale theo nhu cầu.
- **Cost-effective**: Chỉ trả tiền cho những gì sử dụng.
- **Low Maintenance**: Không cần quản lý server.
- **Global Distribution**: Edge locations trên toàn thế giới.

### 2.4.3. API Design

**RESTful API**:
- DevPrep sử dụng RESTful principles để thiết kế API.

- **Endpoints chính**:
  - `/auth/*` - Authentication endpoints
  - `/jobs/*` - Job management endpoints
  - `/applications/*` - Application management endpoints
  - `/interviews/*` - Interview management endpoints
  - `/candidate-profiles/*` - Candidate profile endpoints
  - `/companies/*` - Company management endpoints

**Response Format**:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

**Error Handling**:
- Consistent error response format.
- Appropriate HTTP status codes.
- Detailed error messages for debugging.

## 2.5. Các nghiên cứu liên quan

### 2.5.1. AI trong Tuyển dụng

**Nghiên cứu của LinkedIn (2023)**:
- 67% nhà tuyển dụng sử dụng AI trong một số khía cạnh của quy trình tuyển dụng.
- AI giúp giảm 50% thời gian sàng lọc ứng viên.
- Tuy nhiên, vẫn còn lo ngại về bias trong AI.

**Nghiên cứu của SHRM (2022)**:
- Chi phí trung bình để tuyển một nhân viên: $4,700.
- Thời gian trung bình từ ứng tuyển đến tuyển dụng: 36 ngày.
- Phỏng vấn chiếm 40% tổng thời gian tuyển dụng.

### 2.5.2. Voice AI trong Phỏng vấn

**Nghiên cứu của HireVue**:
- Ứng viên cảm thấy thoải mái hơn với AI interviewer so với con người trong giai đoạn sàng lọc ban đầu.
- AI có thể đánh giá consistency tốt hơn con người.
- Tuy nhiên, cần cân bằng giữa automation và human touch.

**Nghiên cứu của Pymetrics**:
- AI có thể giảm bias trong đánh giá ứng viên.
- Cần transparency trong cách AI đưa ra quyết định.
- Ứng viên muốn biết tại sao họ được chấp nhận hoặc từ chối.

### 2.5.3. So sánh với các hệ thống tương tự

**DevPrep vs LinkedIn**:
- LinkedIn: Tập trung vào networking, không có phỏng vấn AI tích hợp.
- DevPrep: Tập trung vào quy trình ứng tuyển với phỏng vấn AI thông minh.

**DevPrep vs HireVue**:
- HireVue: Enterprise-focused, chi phí cao, phỏng vấn video đơn giản.
- DevPrep: Accessible cho mọi quy mô, tích hợp AI analysis sâu hơn, real-time voice interaction.

**DevPrep vs Indeed**:
- Indeed: Tập trung vào job search, phỏng vấn video cơ bản.
- DevPrep: End-to-end solution với AI-powered interview và analysis.

## 2.6. Phương pháp nghiên cứu và phát triển

### 2.6.1. Phương pháp Agile

- **Sprint Planning**: Chia nhỏ công việc thành các sprint 2 tuần.
- **Daily Standups**: Cập nhật tiến độ hàng ngày.
- **Sprint Review**: Demo tính năng mới sau mỗi sprint.
- **Retrospective**: Cải thiện quy trình sau mỗi sprint.

### 2.6.2. Test-Driven Development (TDD)

- Viết test trước khi implement feature.
- Đảm bảo code coverage cao.
- Unit tests cho các functions quan trọng.
- Integration tests cho API endpoints.

### 2.6.3. Continuous Integration/Continuous Deployment (CI/CD)

- **GitHub Actions**: Tự động chạy tests khi có PR.
- **Automated Deployment**: Tự động deploy khi merge vào main branch.
- **Environment Management**: Separate environments cho dev, staging, và production.

### 2.6.4. User-Centered Design

- **User Research**: Phỏng vấn ứng viên và nhà tuyển dụng để hiểu nhu cầu.
- **Prototyping**: Tạo prototype để test ý tưởng sớm.
- **User Testing**: Test với người dùng thật để thu thập feedback.
- **Iterative Improvement**: Cải thiện dựa trên feedback.

---

## Tóm tắt Chương 2

Chương 2 đã trình bày:

1. **Tổng quan về hệ thống ứng tuyển việc làm**: Khái niệm, đặc điểm, các hệ thống hiện có, và xu hướng phát triển.

2. **Công nghệ AI trong phỏng vấn**: NLP, Speech Recognition, Text-to-Speech, Real-time Voice Communication, và AI Analysis.

3. **Công nghệ phát triển hệ thống**: Frontend (React, TypeScript, Vite), Backend (Hono, Bun, Prisma, PostgreSQL), Infrastructure (Cloudflare), và Authentication (Clerk).

4. **Kiến trúc hệ thống**: Monorepo, Serverless Architecture, và API Design.

5. **Các nghiên cứu liên quan**: AI trong tuyển dụng, Voice AI trong phỏng vấn, và so sánh với các hệ thống tương tự.

6. **Phương pháp nghiên cứu**: Agile, TDD, CI/CD, và User-Centered Design.

Các kiến thức này tạo nền tảng vững chắc cho việc phân tích, thiết kế và triển khai hệ thống DevPrep trong các chương tiếp theo.

---

*Kết thúc Chương 1 và Chương 2*


