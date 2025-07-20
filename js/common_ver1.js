// Timestamp to time array,
// usage: timestamp_to_time_arr(current_timestamp)['hour'])  --> outpus 2 digit hour
function timestamp_to_time_arr(timestamp){

    let num_digits = digits_count(timestamp);
    let timestamp_in_msec = (num_digits == 10) ? timestamp*1000 : timestamp;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    //pad makes leading 0 for single digit. A double digit will just return double digit.
    const pad = num => ("0" + num).slice(-2);
    const date = new Date(timestamp_in_msec);
    
    let yyyy = date.getFullYear(),
    mmm = months[date.getMonth()],
    day = weekday[date.getDay()],
    hours = date.getHours(),
    minutes = date.getMinutes(),
    seconds = date.getSeconds(),
    dd = date.getDate(),
    mm = date.getMonth() + 1,
    yy = date.getFullYear().toString().substr(-2);

    //const return_time_arr = '{"yymmdd":"'+yy+pad(mm)+pad(dd)+'", "hour":"'+pad(hours)+'", "min":"'+pad(minutes)+'", "sec":"'+pad(seconds)+'"}';
    const return_time_arr = '{"date":"'+dd+' '+mmm+', '+yyyy+'","yymmdd":"'+yy+pad(mm)+pad(dd)+'", "hour":"'+pad(hours)+'", "min":"'+pad(minutes)+'", "sec":"'+pad(seconds)+'", "hhmm_string":"'+pad(hours)+':'+pad(minutes)+'", "day":"'+day+'", "hhmm":"'+pad(hours)+pad(minutes)+'"}';
    const return_time_arr_obj = JSON.parse(return_time_arr);
    return return_time_arr_obj;
}

// strDate should be in MM/DD/YYYY HH:mm, other format must be tested before use
function strDate_to_timestamp(strDate){
    var timestamp = Date.parse(strDate);
    return timestamp/1000; //return in sec NOT msec
}

function open_link(link){
    window.open(
        link,
        '_blank' // <- This is what makes it open in a new window.
    );
}

function digits_count(n) {
    var count = 0;
    if (n >= 1) ++count;
  
    while (n / 10 >= 1) {
      n /= 10;
      ++count;
    }
    return count;
}

//Check if string contains any alphabet
function containsAnyLetter(str) {
    return /[a-zA-Z]/.test(str);
}

//sets of pair delimited by '; ' turn into objects.
//to be used for document.cookie to turn into json
function str_obj(str) {
    str = str.split('; ');
    let result = {};
    for (let i = 0; i < str.length; i++) {
        let cur = str[i].split('=');
        result[cur[0]] = cur[1];
    }
    return result;
}

function deleteAllCookies() {
    document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
}


function setCookie(cname, cvalue, expiry) {
	const d = new Date();
	//d.setTime(d.getTime() + (exdays*24*60*60*1000));
	d.setTime(d.getTime() + expiry);
	let expires = "expires="+ d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for(let i = 0; i <ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
		c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
		return c.substring(name.length, c.length);
		}
	}
	return "";
}

function authenticate(){
    let name = "ehsRktmfoq=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for(let i = 0; i <ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
		c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
		return "akdlTek";
		}
	}
	return "";
}