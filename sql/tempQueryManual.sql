TRUNCATE TABLE booking_list;
TRUNCATE TABLE history_chat;

INSERT INTO booking_list (
  booking_number, 
  customer_name, 
  pax, 
  time_created, 
  time_cleared, 
  status, 
  booking_list_id, 
  customer_phone, 
  subscriber_id, 
  q_level,
  store_id,
  booking_from,
  dine_dateTime,
  badge1,
  badge2,
  badge3
) VALUES
-- Completed items (Cancelled/Arrived)
(101, 'Haneul Jung', 1, FROM_UNIXTIME(UNIX_TIMESTAMP() - 840), FROM_UNIXTIME(UNIX_TIMESTAMP() - 720), 'Cancelled', '1', '010-1111-1111', 123456, 100, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 840), '', '', ''),
(302, 'Jimin Lee', 3, FROM_UNIXTIME(UNIX_TIMESTAMP() - 900), FROM_UNIXTIME(UNIX_TIMESTAMP() - 780), 'Arrived', '2', '010-2222-2222', 234567, 100, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 900), '', '', ''),

-- Active items (Waiting/Ready)
(403, 'Yuna Choi', 4, FROM_UNIXTIME(UNIX_TIMESTAMP() - 870), NULL, 'Waiting', '3', '010-3333-3333', 345678, 100, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 870), '', '', ''),
(504, 'Minji Kim', 5, FROM_UNIXTIME(UNIX_TIMESTAMP() - 660), NULL, 'Waiting', '4', '010-4444-4444', 456789, 100, 'DL_Sunway_Geo', 'WEB', FROM_UNIXTIME(UNIX_TIMESTAMP() - 660), 'OUT', '', ''),
(105, 'Juno Lee', 1, FROM_UNIXTIME(UNIX_TIMESTAMP() - 600), NULL, 'Ready', '5', '010-5555-5555', 567890, 300, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 600), 'OUT', '', ''),
(306, 'Seyeon Park', 3, FROM_UNIXTIME(UNIX_TIMESTAMP() - 540), NULL, 'Waiting', '6', '010-6666-6666', 678901, 100, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 540), '', '', ''),
(507, 'Eunwoo Choi', 5, FROM_UNIXTIME(UNIX_TIMESTAMP() - 480), NULL, 'Waiting', '7', '010-7777-7777', 789012, 200, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 480), 'OUT', 'SPLIT', ''),
(308, 'Jihoon Kim', 3, FROM_UNIXTIME(UNIX_TIMESTAMP() - 420), NULL, 'Waiting', '8', '010-8888-8888', 890123, 100, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 420), '', '', ''),
(609, 'Somin Park', 6, FROM_UNIXTIME(UNIX_TIMESTAMP() - 300), NULL, 'Waiting', '9', '010-9999-9999', 901234, 100, 'DL_Sunway_Geo', 'QR', FROM_UNIXTIME(UNIX_TIMESTAMP() - 300), '', '', ''),
(210, 'Taehyun Lee', 2, FROM_UNIXTIME(UNIX_TIMESTAMP() + 600), NULL, 'Waiting', '10', '010-0000-0000', 112345, 100, 'DL_Sunway_Geo', 'WEB', FROM_UNIXTIME(UNIX_TIMESTAMP() + 3610), '', '', '');

-- history_chat 테이블에 mockChatList 데이터 입력

INSERT INTO history_chat (
  Id,
  booking_list_id,
  dateTime,
  qna
) VALUES
(1, '1', FROM_UNIXTIME(UNIX_TIMESTAMP() - 840), 'Waiting'),
(2, '2', FROM_UNIXTIME(UNIX_TIMESTAMP() - 900), 'Waiting'),
(3, '3', FROM_UNIXTIME(UNIX_TIMESTAMP() - 870), 'Waiting'),
(4, '4', FROM_UNIXTIME(UNIX_TIMESTAMP() - 660), 'Waiting'),
(5, '5', FROM_UNIXTIME(UNIX_TIMESTAMP() - 600), 'Waiting'),
(6, '6', FROM_UNIXTIME(UNIX_TIMESTAMP() - 540), 'Waiting'),
(7, '5', FROM_UNIXTIME(UNIX_TIMESTAMP() - 568), 'Q: Table is Ready. Coming?'),
(8, '5', FROM_UNIXTIME(UNIX_TIMESTAMP() - 542), 'A: Coming in 5 mins'),
(9, '7', FROM_UNIXTIME(UNIX_TIMESTAMP() - 480), 'Waiting'),
(10, '7', FROM_UNIXTIME(UNIX_TIMESTAMP() - 450), 'Q: Is outdoor seating OK?'),
(11, '8', FROM_UNIXTIME(UNIX_TIMESTAMP() - 420), 'Waiting'),
(12, '9', FROM_UNIXTIME(UNIX_TIMESTAMP() - 300), 'Waiting')