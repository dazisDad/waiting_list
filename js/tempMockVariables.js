// Create waitlist data based on current time
// Extended list for testing minRowDisplay functionality
let waitlist = [
  // Completed items (will be sorted to the top) - with time_cleared set
  { booking_number: 1005, customer_name: "Haneul Jung", pax: 2, time_created: Date.now() - 45 * 60 * 1000, time_cleared: Date.now() - 40 * 60 * 1000, status: "Cancelled", booking_list_id: "123", customer_phone: "010-1111-1111", subscriber_id: "sub_aaa", q_level: 500 },
  { booking_number: 1008, customer_name: "Jimin Lee", pax: 3, time_created: Date.now() - 50 * 60 * 1000, time_cleared: Date.now() - 45 * 60 * 1000, status: "Arrived", booking_list_id: "234", customer_phone: "010-2222-2222", subscriber_id: "sub_bbb", q_level: 500 },

  // Active items (Waiting/Ready) - no time_cleared
  { booking_number: 1010, customer_name: "Yuna Choi", pax: 4, time_created: Date.now() - 55 * 60 * 1000, time_cleared: null, status: "Waiting", booking_list_id: "456", customer_phone: "010-3333-3333", subscriber_id: "sub_ccc", q_level: 100 },
  { booking_number: 1001, customer_name: "Minji Kim", pax: 4, time_created: Date.now() - 35 * 60 * 1000, time_cleared: null, status: "Waiting", booking_list_id: "235", customer_phone: "010-4444-4444", subscriber_id: "sub_ddd", q_level: 100 },
  { booking_number: 1002, customer_name: "Juno Lee", pax: 2, time_created: Date.now() - 30 * 60 * 1000, time_cleared: null, status: "Ready", booking_list_id: "335", customer_phone: "010-5555-5555", subscriber_id: "sub_eee", q_level: 300 },
  { booking_number: 1003, customer_name: "Seyeon Park", pax: 3, time_created: Date.now() - 25 * 60 * 1000, time_cleared: null, status: "Waiting", booking_list_id: "347", customer_phone: "010-6666-6666", subscriber_id: "sub_fff", q_level: 100 },
  { booking_number: 1004, customer_name: "Eunwoo Choi", pax: 5, time_created: Date.now() - 20 * 60 * 1000, time_cleared: null, status: "Waiting", booking_list_id: "156", customer_phone: "010-7777-7777", subscriber_id: "sub_ggg", q_level: 100 },
  { booking_number: 1006, customer_name: "Jihoon Kim", pax: 3, time_created: Date.now() - 15 * 60 * 1000, time_cleared: null, status: "Waiting", booking_list_id: "287", customer_phone: "010-8888-8888", subscriber_id: "sub_hhh", q_level: 100 },
  { booking_number: 1007, customer_name: "Somin Park", pax: 6, time_created: Date.now() - 10 * 60 * 1000, time_cleared: null, status: "Waiting", booking_list_id: "563", customer_phone: "010-9999-9999", subscriber_id: "sub_iii", q_level: 100 },
  { booking_number: 1009, customer_name: "Taehyun Lee", pax: 2, time_created: Date.now() - 5 * 60 * 1000, time_cleared: null, status: "Waiting", booking_list_id: "763", customer_phone: "010-0000-0000", subscriber_id: "sub_jjj", q_level: 100 },
];

let chatlist = [
  { Id: 1, booking_list_id: "123", dateTime: Date.now() - 45 * 60 * 1000, qna: "Waiting" },
  { Id: 2, booking_list_id: "234", dateTime: Date.now() - 50 * 60 * 1000, qna: "Waiting" },
  { Id: 3, booking_list_id: "456", dateTime: Date.now() - 55 * 60 * 1000, qna: "Waiting" },

  { Id: 4, booking_list_id: "235", dateTime: Date.now() - 35 * 60 * 1000, qna: "Waiting" },
  { Id: 5, booking_list_id: "335", dateTime: Date.now() - 30 * 60 * 1000, qna: "Waiting" },
  { Id: 6, booking_list_id: "347", dateTime: Date.now() - 25 * 60 * 1000, qna: "Waiting" },

  { Id: 7, booking_list_id: "335", dateTime: Date.now() - 23 * 60 * 1000, qna: "Q: Table is Ready. Coming?" },
  { Id: 8, booking_list_id: "335", dateTime: Date.now() - 22 * 60 * 1000, qna: "A: Coming in 5 mins" },

  { Id: 9, booking_list_id: "156", dateTime: Date.now() - 20 * 60 * 1000, qna: "Waiting" },
  { Id: 10, booking_list_id: "156", dateTime: Date.now() - 19 * 60 * 1000, qna: "Q: Is outdoor seating OK?" },

  { Id: 11, booking_list_id: "287", dateTime: Date.now() - 15 * 60 * 1000, qna: "Waiting" },
  { Id: 12, booking_list_id: "563", dateTime: Date.now() - 10 * 60 * 1000, qna: "Waiting" },
  { Id: 13, booking_list_id: "763", dateTime: Date.now() - 5 * 60 * 1000, qna: "Waiting" },
];

let questionnaire = [
  { Id: 1, question: "Table is Ready. Coming?", q_level: 300, minPax: 1 },
  { Id: 2, question: "Is outdoor seating OK?", q_level: 200, minPax: 1 },
  { Id: 3, question: "Is split table OK?", q_level: 200, minPax: 5 },
  { Id: 4, question: "Is sharing table OK?", q_level: 200, minPax: 1 },
  { Id: 5, question: "Table passed to next customer", q_level: 300, q_level_min: 300, minPax: 1 },
  { Id: 6, question: "Is standing table OK?", q_level: 200, minPax: 1 },
];