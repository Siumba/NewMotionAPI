'use strict'
const htmlparser2 = require("htmlparser2");
const http = require('http.min');

require('dotenv').config();

//We store the active token in mem, it gets stale quick anyway
let auth_token = {
    api_cookie: '',
    sessioncookie: '',
    set_date: new Date()
}

let userDetail = {
    id: ''
}

let chargepointDetails = {
    serial: ''
}

async function startSession(id, rfid)
{
    return SessionAction(id,'start', rfid)
}
async function stopSession(id)
{
    return SessionAction(id,'stop', '')
}
async function SessionAction(id, action, rfid)
{
    var body = {
        "rfid": '' + rfid + '',
        "evseNo": 0
    }
    var options = {
        protocol: 'https:',
        host: 'ui-chargepoints.newmotion.com',
        path: '/api/facade/v1/charge-points/' + id + '/remote-control/' + action,
        headers: {
          'content-type': 'application/json',
          'Cookie': 'language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"',
          'accept': 'text/html'
        }
    }
    console.info(action+' charge session')
    let response = (await http.post(options, body))
    return response.data
}

function getSessionCookie(setcookie)
{
    var cookie=''
    setcookie.split('; ').map(
        function (val) { 
            var cookiename = val.split('=')[0]
            if(cookiename==='JSESSIONID')
                cookie=val
        });
    return cookie
}

function parseAuthCookie(setcookie)
{
    var cookie=''
    setcookie.split('; ').map(
        function (val) { 
            var cookiename = val.split('=')[0]
            if(cookiename==='tnm_api')
                cookie=val.split('=')[1]
        });
    return cookie;
}

async function getAuthCookie()
{
    //24 hours ago
    let yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    //console.log('token was generated on '+auth_token.set_date+' lets see if it is stale by comparing with '+yesterday)
    if(auth_token.api_cookie!='' && auth_token.set_date > yesterday)
    {
        console.info('token is still valid')
        return auth_token.api_cookie
    }
    else{
        console.info('stale or invalid token, retrieve new one')
    }
    //Else refresh the cookie first
    let userEmail = process.env.USEREMAIL;
    let userPwd = process.env.PASSWORD;
    

    var options = {
        protocol: 'https:',
        host: 'my.newmotion.com',
        path: '/'
      }
    //Get the new motion html body to get a serverside ajax control setup
    let formmesssage = (await http.get(options))
    let data = formmesssage.data
    //Lets store the session cookie
    let formresponse = formmesssage.response
    let setcookies = formresponse.headers['set-cookie']
    var sessioncookie = getSessionCookie(setcookies[0])
    //Get the elements we need for the authentication post
    var endpointid = ''
    var loginElement = ''
    var pwdElement = ''
    var boolElement = ''
    const parser = new htmlparser2.Parser({
            onopentag(name, attribs, value) {
                if (name === "input" && attribs.id === 'login-email') {
                    loginElement = attribs.name
                }
                if (name === "input" && attribs.id === 'login-pwd') {
                    pwdElement = attribs.name
                }
                if (name === "input" && attribs.type === 'hidden') {
                    boolElement = attribs.name
                }
            }
        },{ decodeEntities: true })
        parser.write(data)
        parser.end()

    var pos = data.indexOf('var lift_page = ')+'var lift_page = '.length+1
    endpointid = data.substr(pos,19)
    //Now create the post message to get the auth cookie
    let formbody = { }
    formbody[loginElement]=userEmail
    formbody[pwdElement]=userPwd
    formbody[boolElement]='true'

    //Now post the new login request
    var options = {
        protocol: 'https:',
        host: 'my.newmotion.com',
        path: '/ajax_request/' + endpointid + '-00/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': ''+sessioncookie+';',
          'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01'
        },
        form: formbody
    }
    let postresponse = (await http.post(options))

    //Now parse the response to get the real token we need
    let message = postresponse.response
    setcookies = message.headers['set-cookie']
    auth_token.sessioncookie = sessioncookie
    auth_token.api_cookie=parseAuthCookie(setcookies[0])
    auth_token.set_date= new Date()
    console.info('new fresh token retrieved')
    return auth_token.api_cookie
}

async function getMyChargeCards()
{
    var options = {
        protocol: 'https:',
        host: 'ui-chargepoints.newmotion.com',
        path: '/api/facade/v1/me/asset-overview',
        headers: {
          'content-type': 'application/octet-stream',
          'Cookie': 'language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"'
        }
      }
    console.info('Retrieving my charge cards')
    let data = JSON.parse((await http.get(options)).data)
    let tokens = data.chargeTokens.map((token) => {
        return {
            rfid: token.rfid,
            printedNumber: token.printedNumber,
            name: token.name
        }
    })
    return tokens
}

async function getMyCars()
{
    var options = {
        protocol: 'https:',
        host: 'ui-mynm-my-vehicles.newmotion.com',
        path: '/api/facade/v1/me/vehicles',
        headers: {
          'content-type': 'application/octet-stream',
          'Cookie': 'language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"'
        }
      }
    console.info('Retrieving my cars')
    let data = JSON.parse((await http.get(options)).data);
    //console.log(JSON.stringify(data));
    let cars = data._embedded.vehicles.map((vehicle) => {
        return {
            id: vehicle.id,
            battery: vehicle.edition.batteryCapacity,
            name: vehicle.name
        }
    })
    return cars
}

function getSinglePoint(id) {
    var promise = new Promise(async function (resolve, reject)
    {
        try{
            var options = {
                protocol: 'https:',
                host: 'ui-chargepoints.newmotion.com',
                path: '/api/facade/v1/charge-points/' + id,
                headers: {
                'content-type': 'application/octet-stream',
                'Cookie': 'language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"'
                }
            }
            let data = JSON.parse((await http.get(options)).data);
            resolve(data);
        } catch (err) {
            reject(err);
        }
    })
    return promise;
}

async function getMyChargePoints()
{  
    if (chargepointDetails.serial!='') {
        return chargepointDetails;
    } else {
        console.log("Charge point details are unknown, fetching them")
    }
    var options = {
        protocol: 'https:',
        host: 'ui-chargepoints.newmotion.com',
        path: '/api/facade/v1/me/asset-overview',
        headers: {
        'content-type': 'application/octet-stream',
        'Cookie': 'language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"'
        }
    }
    console.info('Retrieving my charge points')

    let data = JSON.parse((await http.get(options)).data)
    console.log('All charge point collected');
    let promises = data.chargePoints.map((point) => {
        console.log('point data for point, attempt to get details ['+point.name+'], '+JSON.stringify(point));
        var pointinfo = getSinglePoint(point.uuid).then(cp => {
            return cp;
        },
        err => {
            throw Error('Retrieving single point ['+point.name+'],'+err);
        });
        return pointinfo;
    });



    return await Promise.all(promises)
}

async function getUserId()
{  
    if (userDetail.id!='') {
        return userDetail.id;
    } else {
        var options = {
            protocol: 'https:',
            host: 'ui-chargepoints.newmotion.com',
            path: '/api/facade/v1/me',
            headers: {
            'content-type': 'application/octet-stream',
            'Cookie': 'language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"'
            }
        }
        console.info('Retrieving user info')
    
        let data = JSON.parse((await http.get(options)).data)
        console.log('User info collected');
        return data;
    }
}

async function getLastChargeSessions()
{  
    let serialId;
    let userId;
    if(chargepointDetails!=[] && chargepointDetails.length>0)
    {
        serialId = chargepointDetails[0].serial
    }
    else{
        console.log("Charge point details are unknown, fetching them")
    
        const chargepoints = await getMyChargePoints();
        serialId = chargepoints[0].serial
    }

    if (userDetail.id!='') {
        userId = userDetail.id;
    } else {
        userId = await getUserId()
    }
    var options = {
        protocol: 'https:',
        host: 'ui-chargepoints.newmotion.com',
        path: '/api/facade/v1/user-sessions/charge-points',
        headers: {
        'content-type': 'application/json;charset=UTF-8',
        Cookie: 'language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"'
        
        }
    }
    console.info('Retrieving latest charge sessions')
    console.log(new Date().toISOString().split(".")[0])
    const dToday = new Date().toISOString().split(".")[0];
    const dTimeOffSet = (new Date().getTimezoneOffset() / 60 * -1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});

    //1 month ago
    let monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    monthAgo.setHours(0);
    monthAgo.setMinutes(0);
    monthAgo.setMilliseconds(0);

    let body = {chargePointSerials: [serialId],
        endDateTime: dToday + "+" + dTimeOffSet + ":00",
        // limit: 5,
        offset: 0,
        sortField: "startDateTime",
        sortOrder: "desc",
        startDateTime: monthAgo,
        userId: userId.id
    };
    let data = JSON.parse((await http.post(options, body)).data);
    console.log('Latest charge sessions collected');

    return data;
}

async function getTotalUsage()
{  
    let serialId;
    let firstConnection;
    let userId;
    if(chargepointDetails!=[] && chargepointDetails.length>0)
    {
        serialId = chargepointDetails[0].serial
        firstConnection = chargepointDetails[0].firstConnection
    }
    else{
        console.log("Charge point details are unknown, fetching them")
    
        const chargepoints = await getMyChargePoints();
        serialId = chargepoints[0].serial
        firstConnection = chargepoints[0].firstConnection
    }

    if (userDetail.id!='') {
        userId = userDetail.id;
    } else {
        userId = await getUserId()
    }
    
    const startDate = new Date(firstConnection).getTime();
    const endDate = new Date().getTime();
    const options = {
        protocol: 'https:',
        host: 'my.newmotion.com',
        path: `/user/${userId.id}/dashboard/chargevisual.json?pointId=&chargeCardRfid=&type=point&from=${startDate}&to=${endDate}`,
        headers: {
            Cookie: auth_token.sessioncookie + '; language.code.selection=en; tnm_api=\"' + (await getAuthCookie()) + '\"'
        }
    }
    console.info('Retrieving total usage')
    console.log(options.path)
    console.log(userId);
    
    let data = (await http.get(options)).data;
    console.log('Totale usage collected');

    return data;
}

// module.exports = getSinglePoint
module.exports.getChargepoints = getMyChargePoints
module.exports.getCards = getMyChargeCards
module.exports.getCars = getMyCars
module.exports.startSession = startSession
module.exports.stopSession = stopSession
module.exports.getTotalUsage = getTotalUsage;
module.exports.getLastChargeSessions = getLastChargeSessions;
module.exports.getUser = getUserId;
module.exports.getAuthCookie = getAuthCookie