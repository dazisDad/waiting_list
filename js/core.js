//console.log(Date.now()/1000);

const formatter = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 2,      
	maximumFractionDigits: 2,
 });

function decrementValue(){
	var value = parseInt(document.getElementById('pax').value, 10);
	value = isNaN(value) ? 0 : value;
	if (value > 1){
	  value--;
	  }
	document.getElementById('pax').value = value;
}
function incrementValue(){
	var value = parseInt(document.getElementById('pax').value, 10);
	value = isNaN(value) ? 0 : value;
	value++;
	document.getElementById('pax').value = value;
}


let que_list = {};

function getData(){
	$.ajax({
	type: "POST",
	url: "php/ajax_getData.php",
	success: function(returned){
		returnedObject = JSON.parse(returned);

		console.log('Returned ↓↓↓');
		console.log(returnedObject);

		let rowMax = returnedObject.length;
		let currentQueArray = [];
		let preWaitingArray = [];

		currentQueArray[0] = ['In','Elapsed','Pax','Customer','Contact','Action'];
		preWaitingArray[0] = ['In','ETA','Pax','Customer','Contact','Action'];

		let currentQueArrayIndex=1;
		let preWaitingArrayIndex=1;
		for (let i=0;i<rowMax;i++){
			if(returnedObject[i].dine_date == null){
				currentQueArray[currentQueArrayIndex] = Object.values(returnedObject[i]);
				currentQueArrayIndex++;
			}else{
				preWaitingArray[preWaitingArrayIndex] = Object.values(returnedObject[i]);
				preWaitingArrayIndex++;
			}

			const data = Object.values(returnedObject[i]);
			const [key, ...newData] = data;
			que_list[key] = newData;

		}
		console.table(currentQueArray);
		console.table(preWaitingArray);
		document.getElementById("total_waiting").innerHTML = " ("+(currentQueArrayIndex-1)+")";
		document.getElementById("total_preWaiting").innerHTML = " ("+(preWaitingArrayIndex-1)+")";
		console.log(que_list);

		if (currentQueArrayIndex>1) createTable(currentQueArray, "que_list_table", "currentQue_table_holder");
		if (preWaitingArrayIndex>1) createTable(preWaitingArray,"preWaiting_list_table", "preWaiting_table_holder");

	  }
	});
}

let isCancel_sms = false;
let isOngoing_SMS = false;
let isCancel_sms_alert = true;
function createTable(tableData, tableID, tableHolderID) {
	let table = document.createElement('table');
	table.setAttribute('id',tableID);
	let tableBody = document.createElement('tbody');
	let rowIndex = 0;
	let timestampArray = [];

	tableData.forEach(function(rowData) {
		let row = document.createElement('tr');
		let cellIndex = 0;
		let current_que_id;
		let hasPhone = false;

		rowData.forEach(function(cellData) {
			let cell = document.createElement('td');

			if(rowIndex !=0){
				
				switch (cellIndex){
					case 0:
						current_que_id =  cellData;
						console.log(que_list[current_que_id][12]);

						let checkbox = document.createElement('input');
						checkbox.type = 'checkbox';
						
						if(que_list[current_que_id][12] === 1) {
							checkbox.checked = true;
						}

						checkbox.addEventListener('change', function() {
							if(this.checked) {
								// 체크박스가 체크되었을 때
								fn_isOutsideOK(true, current_que_id);
								alterData("Update", "isOutsideOK", 1, current_que_id,"no_need_refresh");

							} else {
								// 체크박스가 해제되었을 때
								fn_isOutsideOK(false, current_que_id);
								alterData("Update", "isOutsideOK", 0, current_que_id,"no_need_refresh");
							}
						});
						
						cell.appendChild(checkbox);
						
						//cell.appendChild(document.createTextNode(cellData));
						row.appendChild(cell);
						
						break;
					case 1:
						if(que_list[current_que_id][11] == null){ //if null then it is current que list, show elapsed time
							let timestampIndex = rowIndex - 1;
							timestampArray[timestampIndex] = cellData * 1000;
							let para = document.createElement("p");
							para.classList.add('elapsed-time-text');
							cell.appendChild(para);
						}else{ //else it is pre waiting list, show ETA
							let eta = que_list[current_que_id][11];
							cell.appendChild(document.createTextNode(String(eta).slice(0, 2)+":"+String(eta).slice(2, 4)));
						}
						row.appendChild(cell);

						break;
					case 2:
						if(cellData > 4){
							//row.classList.add('more_than_4');
							cell.classList.add('more_than_4');
						}
						cell.addEventListener("click", function(){
							update_pax(current_que_id)
							//alterData("Update", "pax", 7, current_que_id)
							//alertify.success('Pax Change')
						});
						
						cell.appendChild(document.createTextNode(cellData));
						row.appendChild(cell);
						break;

					case 3:
						if(que_list[current_que_id][3] !== null){
							cell.appendChild(document.createTextNode(que_list[current_que_id][3]));
							if(que_list[current_que_id][4] !== null){
								cell.appendChild(document.createElement("br"));
								cell.appendChild(document.createTextNode("***"+String(que_list[current_que_id][4]).substr(-4)));
								hasPhone = true;
								}else{
									cell.addEventListener("click", function(){
										alertify.prompt( 'Prompt Title', 'Enter phone number', ''
										, function(evt, value) {

											value = value.replace(/[^0-9.]/g, '');
											value = (value.charAt(0)=="0") ? "6"+value : value; //include country prefix 6 if omitted

											alterData("Update", "phone", value, current_que_id);
											alertify.success('Phone #' + value + ' added.');
										 }
										, function() { alertify.error('Canceled') }).setting({
											'frameless': true,
											'type': 'tel',
										 });
									});
									hasPhone = false;
								}	
						}else{
							cell.appendChild(document.createTextNode("***"+String(que_list[current_que_id][4]).substr(-4)));
							cell.addEventListener("click", function(){
								alertify.prompt( 'Prompt Title', 'Enter customer name', ''
								, function(evt, value) {
										alterData("Update", "customer", value, current_que_id);
										alertify.success('Name ' + value + ' added.');
									}
								, function() { alertify.error('Canceled') }).setting({
										'frameless': true,
										'type': 'text',
								});
							});
							hasPhone = true;
						}			
						row.appendChild(cell);
						break;
					
					case 4: //whatsapp cell
						if(hasPhone){
							let icon_whatsapp = document.createElement("i");
							icon_whatsapp.className = "fab fa-whatsapp";
							icon_whatsapp.setAttribute('id','whatsapp_'+current_que_id);
							
							//Set click attribute
							cell.addEventListener("click", function(){
								//action_contact(que_list[current_que_id][4])});
								alterData("Update", "whatsapp_status", 2, current_que_id,"no_need_refresh");
								
								//window.open("tel:+"+que_list[current_que_id][4]);

								/*
								window.open(
									'https://wa.me/' + que_list[current_que_id][4] + '?text=%5BDonkas+Lab%5D+Hi%2C+This+is+Donkas+Lab.&amp;app_absent=0%22',
									'_blank' // <- This is what makes it open in a new window.
								);
								*/
								//let message = 'Hi, this is Donkas Lab. We\'ve been contacting you thru the phone but couldn\'t get thru.' + '%0A' + 'Please come now to let us know if you are still interested, we will arrange the next available table.';
								let encodedMessage = encodeURIComponent('Hi, this is Donkas Lab.') + '%0A' + encodeURIComponent('We\'ve been contacting you thru the phone but couldn\'t get thru.') + '%0A' + encodeURIComponent('You may come now if you are still interested, we will arrange the next available table.') + '%0A' + encodeURIComponent('Thank you :)');

								window.open(
									'https://wa.me/' + que_list[current_que_id][4] + '?text=' + encodedMessage + '&app_absent=0',
									'_blank' // <- This makes it open in a new window.
								);




								document.getElementById('whatsapp_'+current_que_id).style.color = "green";
							});
							
							cell.addEventListener('long-press', function(e) {
								
								switch(document.getElementById('whatsapp_'+current_que_id).style.color){
									case "rgb(240, 173, 78)": //#f0ad4e
										alterData("Update", "whatsapp_status", 0, current_que_id,"no_need_refresh");
										document.getElementById('whatsapp_'+current_que_id).style.color = "green";
										alertify.success("#"+current_que_id +": Whatsapp status changed to 'Contacted");
										break;
									default:
										console.log(document.getElementById('whatsapp_'+current_que_id).style.color);
										alterData("Update", "whatsapp_status", 1, current_que_id,"no_need_refresh");
										document.getElementById('whatsapp_'+current_que_id).style.color = "#f0ad4e";
										alertify.error("#"+current_que_id +": Whatsapp status changed to 'No Response'");
										break;
								}
							  });


							cell.appendChild(icon_whatsapp);
							cell.style.width = "11vw";
							//console.log(que_list[current_que_id][7]);
							if(que_list[current_que_id][8]==2) icon_whatsapp.style.color = "green";
							if(que_list[current_que_id][8]==1) icon_whatsapp.style.color = "#f0ad4e";

							
						}else{
							cell.setAttribute("colspan", "3");
						}
						row.appendChild(cell);
						break;

					case 5: //SMS Cell
						if(hasPhone){
							let icon_sms = document.createElement("i");
							icon_sms.className = "fa-solid fa-envelope";
							icon_sms.setAttribute('id','sms_'+current_que_id);
							
							//Set click attribute
							
								cell.addEventListener("click", function(){
									if(que_list[current_que_id][6]<3){
										if(!isOngoing_SMS){
											isOngoing_SMS = true; //Will be reset to false in sms_api()
											isCancel_sms = false; //reset to false FIRST when clicked
											//console.log('isCancel_sms reset to false');
											let sms_delay = setTimeout(function() {
												if(!isCancel_sms){
													console.log('SMS now sent successful');
													//console.log(que_list[current_que_id][4])
													sms_api(current_que_id);
													que_list[current_que_id][6]++;
													console.log('SMS status: '+que_list[current_que_id][6]);
													isCancel_sms_alert = false;

												}else{
													console.log('SMS sending canceled');
												}
											}, 4900);
											
											let sendNo = que_list[current_que_id][6] + 1;
											alertify.notify('#'+current_que_id +': Sending (' + sendNo + '/3)... (Click to Cancel)', 'success', 5, function(){
												isCancel_sms = true;
												clearTimeout(sms_delay);
												isOngoing_SMS = false;
												
												if(isCancel_sms_alert) alertify.error('#'+current_que_id +': SMS sending canceled.');
												isCancel_sms_alert = true;
												}
												);

										}else{
											alertify.error('Please wait for ongoing SMS to be sent.');
										}
									}else{
										alertify.error('No SMS left to send.');
									}
								});
							

							//Long press option
							
								cell.addEventListener('long-press', function(e) {
									if(que_list[current_que_id][6]==1 || que_list[current_que_id][6]==null){
										alertify.error('SMS Long pressed enabled');
										if(!isOngoing_SMS){
											isOngoing_SMS = true; //Will be reset to false in sms_api()
											isCancel_sms = false; //reset to false FIRST when clicked
											//console.log('isCancel_sms reset to false');
											let sms_delay = setTimeout(function() {
												if(!isCancel_sms){
													console.log('SMS now sent successful');
													sms_api(current_que_id,true); //Skip second msg
													que_list[current_que_id][6] = 3;
													isCancel_sms_alert = false;

												}else{
													console.log('SMS sending canceled');
												}
											}, 4900);
											
											alertify.notify('#'+current_que_id +': Sending (3/3)... (Click to Cancel)', 'success', 5, function(){
												isCancel_sms = true;
												//console.log('isCancel_sms reset to true');
												clearTimeout(sms_delay);
												isOngoing_SMS = false;
												
												if(isCancel_sms_alert) alertify.error('#'+current_que_id +': SMS sending canceled.');
												isCancel_sms_alert = true;
												}
												);
											
											//action_contact(que_list[current_que_id][4]);

										}else{
											alertify.error('Please wait for ongoing SMS to be sent.');
										}
									}
								});
							
							//Long press option end

							cell.appendChild(icon_sms);
							cell.style.width = "11vw";
							//console.log(que_list[current_que_id][6]);
							if(que_list[current_que_id][6]==2) icon_sms.style.color = "#f0ad4e";
							if(que_list[current_que_id][6]==3) icon_sms.style.color = "green";

							row.appendChild(cell);
						}
						
						break;

					case 6: //Phone Cell
						if(hasPhone){
							let icon_call = document.createElement("i");
							icon_call.className = "fa-solid fa-phone";
							icon_call.setAttribute('id','call_'+current_que_id);
							cell.addEventListener("click", function(){
								//action_contact(que_list[current_que_id][4])});
								alterData("Update", "call_status", 2, current_que_id,"no_need_refresh");
								window.open("tel:+"+que_list[current_que_id][4]);
								document.getElementById('call_'+current_que_id).style.color = "green";
							});
							
							cell.addEventListener('long-press', function(e) {
								
								switch(document.getElementById('call_'+current_que_id).style.color){
									case "rgb(240, 173, 78)": //#f0ad4e
										alterData("Update", "call_status", 0, current_que_id,"no_need_refresh");
										document.getElementById('call_'+current_que_id).style.color = "";
										alertify.error("#"+current_que_id +": Call history erased.");
										break;
									default:
										console.log(document.getElementById('call_'+current_que_id).style.color);
										alterData("Update", "call_status", 1, current_que_id,"no_need_refresh");
										document.getElementById('call_'+current_que_id).style.color = "#f0ad4e";
										alertify.error("#"+current_que_id +": Call status changed to 'No Answer'");
										break;
								}
							  });


							cell.appendChild(icon_call);
							cell.style.width = "11vw";
							//console.log(que_list[current_que_id][7]);
							if(que_list[current_que_id][7]==2) icon_call.style.color = "green";
							if(que_list[current_que_id][7]==1) icon_call.style.color = "#f0ad4e";
							row.appendChild(cell);
						}
						
						break;

					case 7:
						let icon_check = document.createElement("i");
						icon_check.className = "fa-solid fa-check";
						cell.addEventListener("click", function(){
							action_check(current_que_id)});
						cell.appendChild(icon_check);
						cell.style.width = "11vw";
						row.appendChild(cell);
						break;

					//case 7:
					case 8:
					case 9:
					case 10:
					case 11:
					case 12:
					case 13:
						break;
					
					default:
						cell.appendChild(document.createTextNode(cellData));
						row.appendChild(cell);
				}
			}else{
				cell.appendChild(document.createTextNode(cellData));
				if(cellIndex == 4) {
					cell.setAttribute("colspan", "3");
				}
				row.appendChild(cell);
			}
			cellIndex++;
		});
	
		tableBody.appendChild(row);
		rowIndex++;
	});
  
	table.appendChild(tableBody);
	document.getElementById(tableHolderID).appendChild(table);
	
	//Start time elapsed
	for(let j=0; j<timestampArray.length; j++){
		startStopwatch(j,timestampArray[j]);
	}
  }


function startStopwatch(i,startTimeInput) {
	let elapsedTimeText = document.getElementsByClassName("elapsed-time-text")[i];
	let startTime = new Date(startTimeInput);
	setInterval(() => {
		elapsedTimeText.innerText = timeAndDateHandling.getElapsedTime(startTime); //pass the actual record start time
	}, 1000);
}

//API for time and date functions
let timeAndDateHandling = {
  getElapsedTime: function (startTime) {
    let endTime = new Date();
    let timeDiff = endTime.getTime() - startTime.getTime();
    timeDiff = timeDiff / 1000;
    let seconds = Math.floor(timeDiff % 60); //ignoring uncomplete seconds (floor)
    let secondsAsString = seconds < 10 ? "0" + seconds : seconds + "";
    timeDiff = Math.floor(timeDiff / 60);
    let minutes = timeDiff % 60; //no need to floor possible incomplete minutes, becase they've been handled as seconds
    let minutesAsString = minutes < 10 ? "0" + minutes : minutes + "";
    timeDiff = Math.floor(timeDiff / 60);
    let hours = timeDiff % 24; //no need to floor possible incomplete hours, becase they've been handled as seconds
    timeDiff = Math.floor(timeDiff / 24);
    let days = timeDiff;
    let totalHours = hours + days * 24; // add days to hours
    let totalHoursAsString = totalHours < 10 ? "0" + totalHours : totalHours + "";
    if (totalHoursAsString === "00") {
      return minutesAsString + ":" + secondsAsString;
    } else {
      return totalHoursAsString + ":" + minutesAsString + ":" + secondsAsString;
    }
  	}
};

function getPhone(){
	let pax = document.getElementById('pax').value;
	console.log(pax);
	alertify.prompt( 'Prompt Title', 'Enter phone number', ''
               , function(evt, value) {
				   	console.log(value);
					value = value.replace(/[^0-9.]/g, '');
					console.log(value);

					value = (value.charAt(0)=="0") ? "6"+value : value; //include country prefix 6 if omitted
					alterData("New", "phone", value, pax);
					alertify.success('You entered: ' + value);
				}
               , function() { alertify.error('Canceled') }).setting({
					'frameless': true,
					'type': 'tel',
				});
}

function getName(){
	let pax = document.getElementById('pax').value;
	console.log(pax);
	alertify.prompt( 'Prompt Title', 'Enter customer name', ''
               , function(evt, value) {
					alterData("New", "customer", value, pax);
				}
               , function() { alertify.error('Canceled') }).setting({
					'frameless': true,
					'type': 'text',
				});
}

function alterData(alterType, colName, colVal, pax_or_key, refreshFlag){

	let dataToSend = [alterType, colName, colVal, pax_or_key];
	dataToSend = JSON.stringify(dataToSend);

	$.ajax({
		type: "POST",
		url: "php/ajax_alterData.php",
		data: {data : dataToSend},
		dataType: "json",
		success: function(returned){
			
			if(refreshFlag != 'no_need_refresh'){
				if(document.getElementById('que_list_table')){
					document.getElementById('currentQue_table_holder').removeChild(document.getElementById('que_list_table'));
					console.log('Current Que Table Refreshed');
				}
				if(document.getElementById('preWaiting_list_table')){
					document.getElementById('preWaiting_table_holder').removeChild(document.getElementById('preWaiting_list_table'));
					console.log('Pre Waiting Table Refreshed');
				}
				getData();
			}

			if(colName == 'phone'){
				if(alterType == 'New'){
					console.log('New ID: '+ returned[0]['Id']);
					sms_api(returned[0]['Id']);
				}else{
					sms_api(pax_or_key);
				}
				
			}


			
		}
	});

}

function action_check(que_id){
	console.log(que_id);
	alertify.confirm('Confirm check in for #'+que_id)
	.setHeader('')
	.set({
		'invokeOnCloseOff': true,
		'labels': {ok:'Not coming', cancel:'Checked In'},
		'oncancel':function() {
			alterData("Update", "remarks", null, que_id);
			alertify.success('#'+ que_id +' has checked in.');
		},
		'onok':function() {
			alterData("Update", "remarks", "No show", que_id);
			alertify.error('No show.');
		}
	});
}

function action_contact(phone){
	console.log(phone);
	alertify.confirm('Contact customer by SMS or Call?')
	.setHeader('')
	.set({
		'invokeOnCloseOff': true,
		'labels': {ok:'SMS', cancel:'Call'},
		'oncancel':function() {
			window.open("tel:+"+phone);
			//alertify.success('Calling...');
		},
		'onok':function() {
			sms_api(phone);
			//alertify.success('SMS Sent');
		}
	});
}

function update_pax(que_id){
	alertify.prompt( 'Prompt Title', 'Enter new pax for #'+que_id, ''
               , function(evt, value) {
					alterData("Update", "pax", value, que_id);
				}
               , function() { alertify.error('Cancel') }).setting({
					//'basic': 'true',
					'frameless': true,
					'type': 'tel',
					/*
					'labels': {
						'ok': 'OK Lah',
						'cancel': 'Cancel Lah'
					}
					*/
				});
}

function sms_api(que_id,isSkipSecond){
	
	let sms_info = {};
	sms_info.mode = "live"; // if "debug" msg will not be sent
	sms_info.que_id = que_id;
	sms_info.isSkipSecond = isSkipSecond;
	//sms_info.msg = "[Donkas Lab] You're up next! Please get ready to have DONKAS :)";

	//console.log(sms_info);

	let sms_info_stringified = JSON.stringify(sms_info);
	
    $.ajax({
    type: "POST",
    url: "php/ajax_sms.php",
    data: {data : sms_info_stringified},
    dataType: "json",
    success: function(returned){
        //let returned_ojc = JSON.parse(returned);
        //console.log(returned_ojc);
		console.log('msg sent: '+returned['db_data'][0]);
		console.log('sms status code: '+returned['db_data'][1]);
		//que_list[que_id][6] = returned['db_data'][1];

		if(returned['db_data'][1] < 4){
			let returned_ojc = JSON.parse(returned['response']);
			console.log(returned_ojc);
	
			if(sms_info.mode != "debug"){
				console.log(formatter.format(returned_ojc.messages[0]["remaining-balance"]));
				alertify.success('SMS Sent / Bal: ' + formatter.format(returned_ojc.messages[0]["remaining-balance"]));
			}else{
				alertify.success('[DEBUG MODE] SMS Sent | Balance: &euro;' + formatter.format(11.1234));
			}

			switch (returned['db_data'][1]){
				case 2:
					document.getElementById('sms_'+que_id).style.color = "#f0ad4e";
					break;
				case 3:
					document.getElementById('sms_'+que_id).style.color = "green";
					break;
				default:
			}

		}else{
			alertify.error('No SMS left to send.');
		}

		
    }
    });
}

function fn_isOutsideOK(isOutsideOK, que_id) {
	console.log('Que Id: '+ que_id + ' (' + isOutsideOK + ')');
}