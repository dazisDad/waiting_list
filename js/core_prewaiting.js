//deleteAllCookies();
//setCookie("que_no","5195","1662809100000");
//setCookie("expiryDate","1662809100000");

/**Constants & variables
 * ----------------------------------------------------------------------------
 */
 const date_selector = document.querySelector('#date_selector')
 const time_selector = document.querySelector('#time_selector')
 const pax_selector = document.querySelector('#pax_selector')
 const name_selector = document.querySelector('#customer_name')
 const phone_selector = document.querySelector('#customer_contact')
 const btn = document.querySelector('#btn');
 
 
 /**On loads
  * ----------------------------------------------------------------------------
  */
 for(let i=0; i<7; i++){
	 let timestamp_now = Date.now();
	 timestamp_now = timestamp_now + 86400000 * i;
	 (i==0) ? day_info = ' (Today)' : (i==1) ? day_info = ' (Tomorrow)' : day_info = ' ('+timestamp_to_time_arr(timestamp_now).day+')';
	 appendOption("date_selector", timestamp_to_time_arr(timestamp_now).date+day_info,timestamp_to_time_arr(timestamp_now).yymmdd);
 }
 
 date_selector.onchange = (event) => {
	 event.preventDefault();
	 checkSlots(date_selector.value);
 };
 
 time_selector.onchange = (event) => {
	 event.preventDefault();
	 //If pax is already selected, make other input fields all visible
	 if(document.getElementById("pax_selector").selectedIndex != 0){
		 document.getElementById("pax_selector").style.visibility = "visible";
		 document.getElementById("customer_name").style.visibility = "visible";
		 document.getElementById("customer_contact").style.visibility = "visible";
		 document.getElementById("btn").style.visibility = "visible";
	 }else{//If not, only show pax selector
		 document.getElementById("pax_selector").style.visibility = "visible";
	 }
 };
 
 pax_selector.onchange = (event) => {
	 event.preventDefault();
	 //console.log(pax_selector.value);
	 document.getElementById("customer_name").style.visibility = "visible";
	 document.getElementById("customer_contact").style.visibility = "visible";
	 document.getElementById("btn").style.visibility = "visible";
 };
 
 btn.onclick = (event) => {
	 event.preventDefault();	
	 storeData();
 };
 
 
 
 /**Functions
  * ----------------------------------------------------------------------------
  */
 
 
 
 function removeAllChildNodes(parent) {
	 while (parent.firstChild) {
		 parent.removeChild(parent.firstChild);
		 console.log('removed')
	 }
 }
 
 
 function appendOption (option_id, option_text,option_value){
	 let option = document.createElement("option");
	 option.text = option_text;
	 option.value = option_value;
	 let select = document.getElementById(option_id);
	 select.appendChild(option);
 }
 
 function createOptions(time_slots_na){
	 //console.log(time_slots_na);
 
	 //removes any existing options
	 const container = document.querySelector('#time_selector');
	 removeAllChildNodes(container);
 
	 appendOption ("time_selector", 'Select Time','');
	 appendOption ("time_selector", '--- Lunch ---','');
	 $("#time_selector option:first").attr("disabled", "true");
	 $("#time_selector option:first").attr("selected", "true");
	 $("#time_selector option:last").attr("disabled", "true");
 
	 let skip_counter=0;
	 let skip_lunch_flag;
	 let skip_dinner_flag;
	 let timestamp_now = Date.now();
	 let time_slots_lunch = [1200,1215,1230,1245,1300,1315,1330,1345,1400,1415,1430,1445];
	 let time_slots_lunch_cutoff = [1200,1215,1230,1245,1300,1315,1330,1345,1400,1415,1430,1445];
	 for (let i=0; i<time_slots_lunch.length; i++){
		 if (date_selector.value == timestamp_to_time_arr(timestamp_now).yymmdd){
			 if(timestamp_to_time_arr(timestamp_now).hhmm < time_slots_lunch_cutoff[i]){
				 appendOption ("time_selector", String(time_slots_lunch[i]).slice(0, 2)+":"+String(time_slots_lunch[i]).slice(2, 4),time_slots_lunch[i]);
			 }else{
				 console.log('skipped');
				 skip_counter++;
				 if(skip_counter == time_slots_lunch.length){
					 console.log('removed lunch');
					 $("#time_selector option:last").attr("hidden", "true");
					 skip_counter = 0;
					 skip_lunch_flag = true;
				 }
			 }
		 }else{
			 appendOption ("time_selector", String(time_slots_lunch[i]).slice(0, 2)+":"+String(time_slots_lunch[i]).slice(2, 4),time_slots_lunch[i]);
		 }
 
		 //check if the time selected is already booked
		 for (let j=0; j<time_slots_na.length; j++) {
			 if(time_slots_lunch[i] == time_slots_na[j]){
				 $("#time_selector option:last").attr("disabled", "true");
				 $("#time_selector option:last").html(String(time_slots_lunch[i]).slice(0, 2)+":"+String(time_slots_lunch[i]).slice(2, 4) + " (N/A)");
			 }
		 }
 
	 }
	 
	 appendOption ("time_selector", '--- Dinner ---','');
	 $("#time_selector option:last").attr("disabled", "true");
	 let time_slots_dinner = [1800,1815,1830,1845,1900,1915,1930,1945,2000,2015,2030];
	 let time_slots_dinner_cutoff = [1800,1815,1830,1845,1900,1915,1930,1945,2000,2015,2030];
	 for (let i=0; i<time_slots_dinner.length; i++){
		 if (date_selector.value == timestamp_to_time_arr(timestamp_now).yymmdd){
			 if(timestamp_to_time_arr(timestamp_now).hhmm < time_slots_dinner_cutoff[i]){
				 appendOption ("time_selector", String(time_slots_dinner[i]).slice(0, 2)+":"+String(time_slots_dinner[i]).slice(2, 4),time_slots_dinner[i]);
			 }else{
				 console.log('skipped');
				 skip_counter++;
				 if(skip_counter == time_slots_dinner.length){
					 console.log('removed dinner');
					 $("#time_selector option:last").attr("hidden", "true");
					 skip_counter = 0;
					 skip_dinner_flag = true;
				 }
			 }
		 }else{
			 appendOption ("time_selector", String(time_slots_dinner[i]).slice(0, 2)+":"+String(time_slots_dinner[i]).slice(2, 4),time_slots_dinner[i]);
		 }
		 
		 //check if the time selected is already booked
		 for (let j=0; j<time_slots_na.length; j++) {
			 if(time_slots_dinner[i] == time_slots_na[j]){
				 $("#time_selector option:last").attr("disabled", "true");
				 $("#time_selector option:last").html(String(time_slots_dinner[i]).slice(0, 2)+":"+String(time_slots_dinner[i]).slice(2, 4) + " (N/A)");
			 }
		 }
	 }
 
	 if(skip_lunch_flag && skip_dinner_flag){
		 console.log('all removed');
		 removeAllChildNodes(container);
		 appendOption ("time_selector", "No Time Slot is Available","");
	 }
 
	 document.getElementById("time_selector").style.visibility = "visible";
	 document.getElementById("pax_selector").style.visibility = "hidden";
	 document.getElementById("customer_name").style.visibility = "hidden";
	 document.getElementById("customer_contact").style.visibility = "hidden";
	 document.getElementById("btn").style.visibility = "hidden";
 }
 
 
 function storeData(){
 
	 let phone_formatted = phone_selector.value.replace(/[^[0-9]*$]/g, '');
	 phone_formatted = (phone_formatted.charAt(0)=="0") ? "6"+phone_formatted : phone_formatted;
	 
	 console.log(digits_count(phone_formatted))
	 console.log(containsAnyLetter(name_selector.value))
 
	 if(!containsAnyLetter(name_selector.value)) alertify.error('Name should contain alphabet.');
	 
	 let isPhoneValid = false;
	 if(digits_count(phone_formatted)==11 || digits_count(phone_formatted)==12){
		 isPhoneValid = true;
	 }else{
		 alertify.error('Please check your phone No.');
	 }
 
	 if(containsAnyLetter(name_selector.value) && isPhoneValid){
		 let dataToSend = [date_selector.value, time_selector.value, pax_selector.value, name_selector.value, phone_formatted];
		 dataToSend = JSON.stringify(dataToSend);
		 
		 $.ajax({
			 type: "POST",
			 url: "php/ajax_prewaiting_storeData.php",
			 data: {data : dataToSend},
			 dataType: "json",
			 success: function(returned){
					console.log(returned);
					alertify.success('Successful');
					if(document.getElementById('preWaiting_list_table')){
					document.getElementById('preWaiting_table_holder').removeChild(document.getElementById('preWaiting_list_table'));
					console.log('Pre Waiting Table Refreshed');
					}
					getData();
					modalClose();
			 }
		 });
	 }
 }
 
 
 function checkSlots(date){
	 let dataToSend = [date];
	 dataToSend = JSON.stringify(dataToSend);
	 $.ajax({
		 type: "POST",
		 url: "php/ajax_prewaiting_checkSlots.php",
		 data: {data : dataToSend},
		 dataType: "json",
		 success: function(returned){
			 //console.log(returned);
			 let time_slots_na = [];
			 for(let i=0; i<returned.length; i++){
				 time_slots_na.push(parseInt(returned[i].dine_time));
			 }
			 console.log(time_slots_na);
			 createOptions(time_slots_na);
		 }
	 });
 }
 

 // Get the modal
var modal = document.getElementById("reservation_div");

// Get the button that opens the modal
var modalbtn = document.getElementById("addSign");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal 
//modalbtn.onclick = 

modalbtn.onclick = function() { 	
	modal.style.display = "block";
}


// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modalClose();
}

function modalClose(){
	document.getElementById("reservation_form").reset();
	document.getElementById("time_selector").style.visibility = "hidden";
	document.getElementById("pax_selector").style.visibility = "hidden";
	document.getElementById("customer_name").style.visibility = "hidden";
	document.getElementById("customer_contact").style.visibility = "hidden";
	document.getElementById("btn").style.visibility = "hidden";
	modal.style.display = "none";
}

/*
// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
*/