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
  booking_from
) VALUES
-- Completed items (Cancelled/Arrived)
(101, 'Haneul Jung', 2, FROM_UNIXTIME(UNIX_TIMESTAMP() - 2700), FROM_UNIXTIME(UNIX_TIMESTAMP() - 2400), 'Cancelled', '1', '010-1111-1111', 'sub_aaa', 500, 'DL_Sunway_Geo', 'QR'),
(202, 'Jimin Lee', 3, FROM_UNIXTIME(UNIX_TIMESTAMP() - 3000), FROM_UNIXTIME(UNIX_TIMESTAMP() - 2700), 'Arrived', '2', '010-2222-2222', 'sub_bbb', 500, 'DL_Sunway_Geo', 'QR'),

-- Active items (Waiting/Ready)
(403, 'Yuna Choi', 4, FROM_UNIXTIME(UNIX_TIMESTAMP() - 3300), NULL, 'Waiting', '3', '010-3333-3333', 'sub_ccc', 100, 'DL_Sunway_Geo', 'QR'),
(404, 'Minji Kim', 4, FROM_UNIXTIME(UNIX_TIMESTAMP() - 2100), NULL, 'Waiting', '4', '010-4444-4444', 'sub_ddd', 100, 'DL_Sunway_Geo', 'QR'),
(205, 'Juno Lee', 2, FROM_UNIXTIME(UNIX_TIMESTAMP() - 1800), NULL, 'Ready', '5', '010-5555-5555', 'sub_eee', 300, 'DL_Sunway_Geo', 'QR'),
(306, 'Seyeon Park', 3, FROM_UNIXTIME(UNIX_TIMESTAMP() - 1500), NULL, 'Waiting', '6', '010-6666-6666', 'sub_fff', 100, 'DL_Sunway_Geo', 'QR'),
(507, 'Eunwoo Choi', 5, FROM_UNIXTIME(UNIX_TIMESTAMP() - 1200), NULL, 'Waiting', '7', '010-7777-7777', 'sub_ggg', 100, 'DL_Sunway_Geo', 'QR'),
(308, 'Jihoon Kim', 3, FROM_UNIXTIME(UNIX_TIMESTAMP() - 900), NULL, 'Waiting', '8', '010-8888-8888', 'sub_hhh', 100, 'DL_Sunway_Geo', 'QR'),
(609, 'Somin Park', 6, FROM_UNIXTIME(UNIX_TIMESTAMP() - 600), NULL, 'Waiting', '9', '010-9999-9999', 'sub_iii', 100, 'DL_Sunway_Geo', 'QR'),
(210, 'Taehyun Lee', 2, FROM_UNIXTIME(UNIX_TIMESTAMP() - 300), NULL, 'Waiting', '10', '010-0000-0000', 'sub_jjj', 100, 'DL_Sunway_Geo', 'QR');

-- history_chat 테이블에 mockChatList 데이터 입력

INSERT INTO history_chat (
  Id,
  booking_list_id,
  dateTime,
  qna
) VALUES
(1, '1', FROM_UNIXTIME(UNIX_TIMESTAMP() - 2700), 'Waiting'),
(2, '2', FROM_UNIXTIME(UNIX_TIMESTAMP() - 3000), 'Waiting'),
(3, '3', FROM_UNIXTIME(UNIX_TIMESTAMP() - 3300), 'Waiting'),
(4, '4', FROM_UNIXTIME(UNIX_TIMESTAMP() - 2100), 'Waiting'),
(5, '5', FROM_UNIXTIME(UNIX_TIMESTAMP() - 1800), 'Waiting'),
(6, '6', FROM_UNIXTIME(UNIX_TIMESTAMP() - 1500), 'Waiting'),
(7, '5', FROM_UNIXTIME(UNIX_TIMESTAMP() - 1380), 'Q: Table is Ready. Coming?'),
(8, '5', FROM_UNIXTIME(UNIX_TIMESTAMP() - 1320), 'A: Coming in 5 mins'),
(9, '7', FROM_UNIXTIME(UNIX_TIMESTAMP() - 1200), 'Waiting'),
(10, '7', FROM_UNIXTIME(UNIX_TIMESTAMP() - 1140), 'Q: Is outdoor seating OK?'),
(11, '8', FROM_UNIXTIME(UNIX_TIMESTAMP() - 900), 'Waiting'),
(12, '9', FROM_UNIXTIME(UNIX_TIMESTAMP() - 600), 'Waiting'),
(13, '10', FROM_UNIXTIME(UNIX_TIMESTAMP() - 300), 'Waiting');