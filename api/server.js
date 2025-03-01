// server.js - Main server file
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ical = require('ical-generator');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const strftime = require('strftime')
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { start } = require('repl');
const { error, log } = require('console');
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
// Routes
app.get(`/`, (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Login endpoint
app.post(`/api/login`, async (req, res) => {
  try {
    const { username, password } = req.body;

    const response = await axios.post('https://dkmh.hcmuaf.edu.vn/api/auth/login',
      `username=${username}&password=${password}&grant_type=password`,
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'text/plain'
        }
      }
    );

    if (response.data && response.data.access_token) {
      // Success - return token to client
      // console.log(response)
      // req.session.access_token = response.data.access_token;
      res.cookie('access_token', response.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 giờ
      });
      return res.json({ success: true });
      // return res.json({ success: true, access_token: response.data.access_token });
    } else {
      return res.status(401).json({ success: false, message: 'Login failed' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});
app.post(`/api/fetch-semesters`, async (req, res) => {
  try {
    // const { access_token } = req.body;
    const access_token = req.cookies.access_token;
    // if (!access_token) {
    //   return res.status(400).json({ success: false, message: 'Access token is required' });
    // if (!req.session.access_token) {
    if (!access_token) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập trước' });
    }

    const response = await axios.post(
      'https://dkmh.hcmuaf.edu.vn/api/sch/w-locdshockytkbuser',
      {},
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer  ${access_token}`,
          'content-type': 'application/json',
          'Referer': 'https://dkmh.hcmuaf.edu.vn/public/',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      }
    );
    // console.log(response)
    if (response.data && response.data.data) {
      return res.json({ success: true, data: response.data.data });
    } else {
      return res.status(404).json({ success: false, message: 'No semester data found' });
    }
  } catch (error) {
    console.error('Semester fetch error:', error); // Log the entire error object
    if (error.response) {
      console.error('Response status:', error.response.status); // Log response status
      console.error('Response data:', error.response.data);   // Log response data
      if (error.response.status === 401) {
        return res.status(401).json({ success: false, message: 'Unauthorized - please log in again' });
      }
    }
    return res.status(500).json({ success: false, message: 'Server error fetching semesters' });
  }
});
app.post(`/api/fetch-semexam`, async (req, res) => {
  try {
    // const { access_token } = req.body;
    const access_token = req.cookies.access_token;
    // if (!access_token) {
    //   return res.status(400).json({ success: false, message: 'Access token is required' });
    // if (!req.session.access_token) {
    if (!access_token) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập trước' });
    }

    const response = await axios.post(
      `https://dkmh.hcmuaf.edu.vn/api/report/w-locdshockylichthisinhvien`,
      {
        filter: { is_tieng_anh: false },
        additional: {
          paging: { limit: 100, page: 1 },
          ordering: [{ name: null, order_type: null }]
        }
      },
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer  ${access_token}`,
          'content-type': 'application/json',
          'Referer': 'https://dkmh.hcmuaf.edu.vn/public',
          "sec-fetch-mode": "cors",
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      }
    );
    // console.log(response);

    if (response.data && response.data.data) {
      return res.json({ success: true, data: response.data.data });
    } else {
      return res.status(404).json({ success: false, message: 'No semester data found' });
    }
  } catch (error) {
    console.error('Semester fetch error:', error); // Log the entire error object
    if (error.response) {
      console.error('Response status:', error.response.status); // Log response status
      console.error('Response data:', error.response.data);   // Log response data
      if (error.response.status === 401) {
        return res.status(401).json({ success: false, message: 'Unauthorized - please log in again' });
      }
    }
    return res.status(500).json({ success: false, message: 'Server error fetching semesters' });
  }
});


app.post('/api/fetch-exam', async (req, res) => {
  try {
    const { semester = 20242 } = req.body;
    const access_token = req.cookies.access_token;
    if (!access_token) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập trước' });
    }
    const response = await axios.post(
      'https://dkmh.hcmuaf.edu.vn/api/epm/w-locdslichthisvtheohocky',
      {
        filter: { hoc_ky: semester, is_giua_ky: false },
        additional: {
          paging: { limit: 100, page: 1 },
          ordering: [{ name: null, order_type: null }]
        }
      },
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${access_token}`,
          'content-type': 'application/json',
          'Referer': 'https://dkmh.hcmuaf.edu.vn/',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      }
    );
    if (response.data) {
      return res.json({ success: true, data: response.data });
    } else {
      return res.status(404).json({ success: false, message: 'No exam schedule data found' });
    }
  } catch (error) {
    console.error('Schedule fetch error:', error.message);
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ success: false, message: 'Unauthorized - please log in again' });
    }
    return res.status(500).json({ success: false, message: 'Server error fetching schedule' });
  }
});

// Fetch schedule endpoint
app.post(`/api/fetch-schedule`, async (req, res) => {
  try {
    // const { access_token, semester = 20242 } = req.body;

    // if (!access_token) {
    //   return res.status(400).json({ success: false, message: 'Access token is required' });
    const { semester = 20242 } = req.body;
    const access_token = req.cookies.access_token;
    // if (!req.session.access_token) {
    //   return res.status(401).json({ success: false, message: 'Please log in first' });
    // }
    if (!access_token) {
      return res.status(401).json({ success: false, message: 'Please log in first' });
    }
    const response = await axios.post(
      'https://dkmh.hcmuaf.edu.vn/api/sch/w-locdstkbtuanusertheohocky',
      {
        filter: { hoc_ky: semester, ten_hoc_ky: "" },
        additional: {
          paging: { limit: 100, page: 1 },
          ordering: [{ name: null, order_type: null }]
        }
      },
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${access_token}`,
          'content-type': 'application/json',
          'Referer': 'https://dkmh.hcmuaf.edu.vn/public/',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      }
    );

    if (response.data) {
      return res.json({ success: true, data: response.data });
    } else {
      return res.status(404).json({ success: false, message: 'No schedule data found' });
    }
  } catch (error) {
    console.error('Schedule fetch error:', error.message);
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ success: false, message: 'Unauthorized - please log in again' });
    }
    return res.status(500).json({ success: false, message: 'Server error fetching schedule' });
  }
});

// Generate ICS file endpoint
app.post(`/api/generate-ics`, (req, res) => {
  try {
    const scheduleData = req.body;

    if (!scheduleData || !scheduleData.data) {
      return res.status(400).json({ success: false, message: 'Schedule data is required' });
    }
    console.log(scheduleData);
    
    // Create calendar
    const calendar = ical({ name: 'TKB NLU' });

    // Define lesson periods by their start and end times
    const periods = {};
    scheduleData.data.data.ds_tiet_trong_ngay.forEach(tiet => {
      if (tiet.gio_bat_dau) {
        periods[tiet.tiet] = [tiet.gio_bat_dau, tiet.gio_ket_thuc];
      }
    });

    // Iterate through weeks
    scheduleData.data.data.ds_tuan_tkb.forEach(week => {
      // Iterate through scheduled classes
      week.ds_thoi_khoa_bieu.forEach(lesson => {
        const lessonDateStr = strftime('%Y-%m-%d', new Date(lesson.ngay_hoc.split('T')[0])); // "YYYY-MM-DD"

        // Get start and end times from the periods object (defaults to "00:00" if not found)
        const [startTime, endTime] = periods[lesson.tiet_bat_dau] || ['00:00', '00:00'];

        // Create Date objects by combining the lesson date and the time strings.
        // We build an ISO string in the format "YYYY-MM-DDTHH:mm:ss".
        // This will work similarly to Python's datetime.strptime.
        const startDate = `${lessonDateStr}T${startTime}:00`;
        const endDate = `${lessonDateStr}T${endTime}:00`;
        // console.log(startDate, endDate);
        // Add event to calendar
        calendar.createEvent({
          start: startDate,
          end: endDate,
          summary: lesson.ten_mon,
          location: lesson.ma_phong,
          description: `Giảng viên: ${lesson.ten_giang_vien}\nMã lớp: ${lesson.ma_lop}\nMã nhóm: ${lesson.ma_nhom}\nThông tin tuần: ${week.thong_tin_tuan}`,
          timezone: 'Asia/Ho_Chi_Minh'
        });
      });
    });

    // Generate ICS content
    let icsContent = calendar.toString();
    

    res.set('Content-Type', 'text/calendar');
    res.set('Content-Disposition', 'attachment; filename=tkb_exported.ics');
    return res.send(icsContent);
  } catch (error) {
    console.error('ICS generation error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error generating ICS file' });
  }
});
// app.post(`/api/google-calendar-urls`, (req, res) => {
//   try {
//     const { scheduleData } = req.body;

//     if (!scheduleData || !scheduleData.data) {
//       return res.status(400).json({ success: false, message: 'Schedule data is required' });
//     }

//     // Define lesson periods by their start and end times
//     const periods = {};
//     scheduleData.data.ds_tiet_trong_ngay.forEach(tiet => {
//       if (tiet.gio_bat_dau) {
//         periods[tiet.tiet] = [tiet.gio_bat_dau, tiet.gio_ket_thuc];
//       }
//     });

//     // Store event data for Google Calendar
//     const events = [];

//     // Iterate through weeks
//     scheduleData.data.ds_tuan_tkb.forEach(week => {
//       // Iterate through scheduled classes
//       week.ds_thoi_khoa_bieu.forEach(lesson => {
//         const lessonDateStr = strftime('%Y-%m-%d', new Date(lesson.ngay_hoc.split('T')[0])); // "YYYY-MM-DD"

//         // Get start and end times from the periods object (defaults to "00:00" if not found)
//         const [startTime, endTime] = periods[lesson.tiet_bat_dau] || ['00:00', '00:00'];

//         // Create Date objects by combining the lesson date and the time strings.
//         // We build an ISO string in the format "YYYY-MM-DDTHH:mm:ss".
//         // This will work similarly to Python's datetime.strptime.
//         const startDate = `${lessonDateStr}T${startTime}:00`;
//         const endDate = `${lessonDateStr}T${endTime}:00`;
//         // console.log(startDate, endDate)
//         // Create event object
//         const event = {
//           summary: lesson.ten_mon,
//           start: startDate,
//           end: endDate,
//           location: lesson.ma_phong,
//           description: `Giảng viên: ${lesson.ten_giang_vien}\nMã lớp: ${lesson.ma_lop}\nMã nhóm: ${lesson.ma_nhom}\nThông tin tuần: ${week.thong_tin_tuan}`,
//           timezone: 'Asia/Ho_Chi_Minh'
//         };
//         events.push(event);
//       });
//     });

//     // Return the event data
//     return res.json({ success: true, events });
//   } catch { error } {
//     console.error('Google Calendar URL generation error:', error.message);
//     return res.status(500).json({ success: false, message: 'Server error generating Google Calendar URLs' });
//   }
// });

app.post(`/api/generate-ics/exam`,  (req, res) => {
  try {
    const examData = req.body;

    if (!examData) {
      return res.status(400).json({ success: false, message: 'Schedule data is required' });
    }

    // Create calendar
    const calendar = ical({ name: 'EXAM NLU' });

    // Iterate through subject
    function addMinutes(timeStr, minutesToAdd) {
      // Chuyển chuỗi thời gian thành đối tượng Date
      let [hoursStr, minutesStr] = timeStr.split(':');
      let hours = parseInt(hoursStr); //7
      let minutes = parseInt(minutesStr); //30
      minutes += parseInt(minutesToAdd); // 30 + 30 = 60
      hours += Math.floor(minutes / 60);
      minutes %= 60;
      hours %= 24;
      return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0')
    }
    function parseVietnameseDate(dateStr) {
      if (!dateStr || typeof dateStr !== 'string') {
        console.error('Invalid date string:', dateStr);
        return null;
      }
      
      const parts = dateStr.split('/');
      if (parts.length !== 3) {
        console.error('Date string does not match expected format (DD/MM/YYYY):', dateStr);
        return null;
      }
      
      // Vietnamese format is typically DD/MM/YYYY, convert to YYYY-MM-DD
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    examData.data.data.ds_lich_thi.forEach(subject => {
      // Iterate through scheduled classes
      
      const subjectDateStr = parseVietnameseDate(subject.ngay_thi); // "YYYY-MM-DD"
      console.log(subjectDateStr);

      const startTime = subject.gio_bat_dau;
      const endTime = addMinutes(startTime, subject.so_phut)

      // Create Date objects by combining the lesson date and the time strings.
      // We build an ISO string in the format "YYYY-MM-DDTHH:mm:ss".
      // This will work similarly to Python's datetime.strptime.
      const startDate = `${subjectDateStr}T${startTime}:00`;
      const endDate = `${subjectDateStr}T${endTime}:00`;
      console.log(startDate, endDate)
      // Add event to calendar
      calendar.createEvent({
        start: startDate,
        end: endDate,
        summary: subject.ten_mon,
        location: `${subject.ma_phong} - ${subject.dia_diem_thi}`,
        description: `Ghép thi: ${subject.ghep_thi}\nTổ thi: ${subject.to_thi}\nMã nhóm: ${subject.nhom_thi}\nSĩ số: ${subject.si_so}\n`,
        timezone: 'Asia/Ho_Chi_Minh'
      });
    });

    // Generate ICS content
    let icsContent = calendar.toString();
    console.log(icsContent, res)
    res.set('Content-Type', 'text/calendar');
    res.set('Content-Disposition', 'attachment; filename=tkb_exported.ics');
    return res.send(icsContent);
  } catch ( error ) {
    console.error('ICS generation error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error generating ICS file' });
  }
});
// app.post(`/api/google-calendar-urls/exam`, (req, res) => {
//   try {
//     const { examData } = req.body;

//     if (!examData || !examData.data) {
//       return res.status(400).json({ success: false, message: 'Schedule data is required' });
//     }

//     // Store event data for Google Calendar
//     const events = [];
//     function addMinutes(timeStr, minutesToAdd) {
//       // Chuyển chuỗi thời gian thành đối tượng Date
//       let [hoursStr, minutesStr] = timeStr.split(':');
//       let hours = parseInt(hoursStr); //7
//       let minutes = parseInt(minutesStr); //30
//       minutes += parseInt(minutesToAdd); // 30 + 30 = 60
//       hours += Math.floor(minutes / 60);
//       minutes %= 60;
//       hours %= 24;
//       return hours + ':' + minutes.toString().padStart(2, '0');
//     }
//     // Iterate through weeks
//     examData.data.ds_lich_thi.forEach(subject => {
//       // Iterate through scheduled classes
//       const subjectDateStr = strftime('%Y-%m-%d', new Date(subject.ngay_thi)); // "YYYY-MM-DD"

//       const startTime = subject.gio_bat_dau;
//       const endTime = addMinutes(startTime, subject.so_phut)

//       // Create Date objects by combining the lesson date and the time strings.
//       // We build an ISO string in the format "YYYY-MM-DDTHH:mm:ss".
//       // This will work similarly to Python's datetime.strptime.
//       const startDate = `${subjectDateStr}T${startTime}:00`;
//       const endDate = `${subjectDateStr}T${endTime}:00`;
//       const event = {
//         start: startDate,
//         end: endDate,
//         summary: subject.ten_mon,
//         location: `${subject.ma_phong}-${subject.dia_diem_thi}`,
//         description: `Ghép thi: ${subject.ghep_thi}\nTổ thi: ${subject.to_thi}\nMã nhóm: ${subject.nhom_thi}\nSĩ số: ${subject.si_so}\n`,
//         timezone: 'Asia/Ho_Chi_Minh'
//       };
//       events.push(event);
//     });

//     // Return the event data
//     return res.json({ success: true, events });
//   } catch { error } {
//     console.error('Google Calendar URL generation error:', error.message);
//     return res.status(500).json({ success: false, message: 'Server error generating Google Calendar URLs' });
//   }
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});