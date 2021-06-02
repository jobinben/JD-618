$.toObj = (t, e = null) => {
	try {
		return JSON.parse(t)
	} catch {
		return e
	}
}
$.toStr = (t, e = null) => {
	try {
		return JSON.stringify(t)
	} catch {
		return e
	}
}
const notify = $.isNode() ? require("./sendNotify") : "";
const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
const sck = $.isNode() ? "set-cookie" : "Set-Cookie";
let cookiesArr = [],
	cookie = "",
	message;
let minPrize = 1;

if ($.isNode()) {
	Object.keys(jdCookieNode).forEach((item) => {
		cookiesArr.push(jdCookieNode[item]);
	});
	if (process.env.JD_DEBUG && process.env.JD_DEBUG === "false") that.log = () => {};
} else {
	cookiesArr = [
		$.getdata("CookieJD"),
		$.getdata("CookieJD2"),
		...jsonParse($.getdata("CookiesJD") || "[]").map((item) => item.cookie),
	].filter((item) => !!item);
}
const JD_API_HOST = "https://api.m.jd.com/client.action";
let authorPin='3cb2c083dc34b258cba098268efd802d';
$.helpAuthor=true;
!(async () => {
	if (!cookiesArr[0]) {
		$.msg(
			$.name,
			"【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取",
			"https://bean.m.jd.com/", {
				"open-url": "https://bean.m.jd.com/"
			}
		);
		return;
	}
	for (let i = 0; i < cookiesArr.length; i++) {
		if (cookiesArr[i]) {
			cookie = cookiesArr[i];
			$.UserName = decodeURIComponent(
				cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]
			);
			$.index = i + 1;
			message = "";
			that.log(`\n******开始【京东账号${$.index}】${$.UserName}*********\n`);
			await main()
		}
	}
})()
.catch((e) => {
		$.log("", `❌ ${$.name}, 失败! 原因: ${e}!`, "");
	})
	.finally(() => {
		$.done();
	});

function showMsg() {
	return new Promise(resolve => {
		$.log($.name, '', `京东账号${$.index}${$.nickName}\n${message}`);
		resolve()
	})
}

async function main() {
	await getToken();
	that.log("当前token：" + $.token);
	if ($.token) {
		await getPin();
		if ($.pin) {
			that.log("当前pin：" + $.pin);
		}
		await getPinList();
		let myScore=await getScore($.pin);
		that.log("我的京享值:"+myScore);
		if($.pinList){
		    for(let index=0;index<$.pinList.length;index++){
		        let item=$.pinList[index];
		         let pin=item.code;
		        let fscore=await getScore(pin);
		        	that.log("别人的京享值:"+fscore);
		        if(fscore<myScore){
		            await launchBattle(pin);
	            	await receiveBattle(pin);
		        }
		    }
		}
		if($.helpAuthor){
		    	let authScore=await getScore(authorPin);
		        that.log("小赤佬的京享值:"+authScore);
		        if(authScore>myScore){//反向操作，嘻嘻嘻
		            that.log('帮小赤佬挑战一次');
		            await launchBattle(authorPin);
	            	await receiveBattle(authorPin);
		        }else{
		            that.log('淦，分比小赤佬高，不挑战了');
		        }
		}
		
		await getBoxRewardInfo();
		that.log("去开宝箱");
		if($.awards){
		    for(let index=0;index<$.awards.length;index++){
		        let item=$.awards[index];
		        if(item.received==0){
		            if($.totalWins>=item.wins){
		                await sendBoxReward(item.id);
		            }
		        }
		    }
		}
	}
}


function getPinList(){
    //https://api.r2ray.com/jd.pk/index
    that.log("获取Pk列表");
	return new Promise((resolve) => {
		let options = {
			"url": `https://api.r2ray.com/jd.pk/index`,
		}

		$.get(options, (err, resp, res) => {
			try {
				if (res) {
					let data = $.toObj(res);
					if (data) {
						$.pinList=data.data;
					}

				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}

function launchBattle(fpin) {
	that.log("发起挑战");
	return new Promise((resolve) => {
		let options = {
			"url": `https://jd.moxigame.cn/likejxz/launchBattle?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=${$.pin}&recipient=${fpin}&relation=1`,
			"headers": {
				"Host": "jd.moxigame.cn",
				"Content-Type": "application/json",
				"Origin": "https://game-cdn.moxigame.cn",
				"Connection": "keep-alive",
				"Accept": " */*",
				"User-Agent": "",
				"Accept-Language": "zh-cn",
			}
		}


		$.get(options, (err, resp, res) => {
			try {
				if (res) {
					let data = $.toObj(res);
					that.log(data);
					if (data) {
						data=data.data;
						if(data.msg){
						    that.log(data.msg);
						}else{
						     that.log($.toStr(data));
						}
					}

				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}

function getScore(fpin){
    that.log("查询"+fpin+"分数");
	return new Promise((resolve) => {
		let options = {
        	"url": "https://jd.moxigame.cn/likejxz/getScore?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin="+fpin,
        	"headers": {
        		"Host": "jd.moxigame.cn",
        		"Content-Type": "application/json",
        		"Origin": "https://game-cdn.moxigame.cn",
        		"Connection": "keep-alive",
        		"Accept": " */*",
        		"User-Agent": "",
        		"Accept-Language": "zh-cn",
        		"Accept-Encoding": "gzip, deflate, br"
        	}
        }

		$.get(options, (err, resp, res) => {
		    let score=0;
			try {
				if (res) {
					let data = $.toObj(res);
					if (data) {
					    score = data.data
					}
				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(score);
			}
		})
	});
}

function receiveBattle(fpin) {
	return new Promise((resolve) => {
		let options = {
			"url": `https://jd.moxigame.cn/likejxz/receiveBattle?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin=${$.pin}&recipient=${fpin}`,
			"headers": {
				"Host": "jd.moxigame.cn",
				"Content-Type": "application/json",
				"Origin": "https://game-cdn.moxigame.cn",
				"Connection": "keep-alive",
				"Accept": " */*",
				"User-Agent": "",
				"Accept-Language": "zh-cn",
				"Accept-Encoding": "gzip, deflate, br"
			}
		}
		$.get(options, (err, resp, res) => {
			try {
				if (res) {
					let data = $.toObj(res);
					that.log(data);
					if (data) {
						data=data.data;
							that.log("挑战成功");
						if(data.state==1){
						    if(data.pkResult){
						        that.log("当前胜场:"+data.pkResult.fromWinNum);
						    }
						}else{
						    that.log($.toStr(data));
						}
					}

				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}

function getBoxRewardInfo() {
	return new Promise((resolve) => {
		let options = {
			"url": "https://pengyougou.m.jd.com/like/jxz/getBoxRewardInfo?actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin="+$.pin,
			"headers": {
				"Host": "jdjoy.jd.com",
				"Origin": "https://prodev.m.jd.com",
				"Cookie": cookie,
				"Connection": "keep-alive",
				"Accept": "application/json, text/plain, */*",
				"User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
				"Accept-Language": "zh-cn",
				"Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
			}
		}

		$.get(options, (err, resp, res) => {
			try {
				that.log(res);
				if (res) {
					let data = $.toObj(res);
					if (data.success) {
						$.awards = data.data.awards;
						$.totalWins=data.data.totalWins;
						that.log("总胜场:"+data.data.totalWins);
					}

				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}


function sendBoxReward(rewardConfigId) {
	return new Promise((resolve) => {
		let options = {
			"url": "https://pengyougou.m.jd.com/like/jxz/sendBoxReward?rewardConfigId="+rewardConfigId+"&actId=8&appId=dafbe42d5bff9d82298e5230eb8c3f79&lkEPin="+$.pin,
			"headers": {
				"Host": "jdjoy.jd.com",
				"Origin": "https://prodev.m.jd.com",
				"Cookie": cookie,
				"Connection": "keep-alive",
				"Accept": "application/json, text/plain, */*",
				"User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
				"Accept-Language": "zh-cn",
				"Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
			}
		}

		$.get(options, (err, resp, res) => {
			try {
				that.log(res);
				if (res) {
					let data = $.toObj(res);
					if (data.success) {
						$.openAwards = data.datas;
						if($.openAwards){
						    $.openAwards.forEach(item=>{
						        that.log('获得奖励:'+$.toStr(item));
						    });
						}
					}

				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}

function getPin() {
	return new Promise((resolve) => {
		let options = {
			"url": "https://jdjoy.jd.com/saas/framework/encrypt/pin?appId=dafbe42d5bff9d82298e5230eb8c3f79",
			"headers": {
				"Host": "jdjoy.jd.com",
				"Origin": "https://prodev.m.jd.com",
				"Cookie": cookie,
				"Connection": "keep-alive",
				"Accept": "application/json, text/plain, */*",
				"User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
				"Accept-Language": "zh-cn",
				"Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
			}
		}

		$.post(options, (err, resp, res) => {
			try {
				that.log(res);
				if (res) {
					let data = $.toObj(res);
					if (data) {
						$.pin = data.data
					}

				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}

function getToken() {
	return new Promise((resolve) => {
		let options = {
			"url": "https://jdjoy.jd.com/saas/framework/user/token?appId=dafbe42d5bff9d82298e5230eb8c3f79&client=m&url=pengyougou.m.jd.com",
			"headers": {
				"Host": "jdjoy.jd.com",
				"Origin": "https://prodev.m.jd.com",
				"Cookie": cookie,
				"Connection": "keep-alive",
				"Accept": "application/json, text/plain, */*",
				"User-Agent": "jdapp;iPhone;9.5.4;13.6;db48e750b34fe9cd5254d970a409af316d8b5cf3;network/wifi;ADID/38EE562E-B8B2-7B58-DFF3-D5A3CED0683A;model/iPhone10,3;addressid/0;appBuild/167668;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1",
				"Accept-Language": "zh-cn",
				"Referer": "https://prodev.m.jd.com/mall/active/4HTqMAvser7ctEBEdhK4yA7fXpPi/index.html?babelChannel=ttt9&tttparams=AeOIMwdeyJnTG5nIjoiMTE3LjAyOTE1NyIsImdMYXQiOiIyNS4wOTUyMDcifQ7%3D%3D&lng=00.000000&lat=00.000000&sid=&un_area="
			}
		}
		$.post(options, (err, resp, res) => {
			try {
				if (res) {
					let data = $.toObj(res);
					if (data) {
						$.token = data.data
					}

				}
			} catch (e) {
				that.log(e);
			} finally {
				resolve(res);
			}
		})
	});
}


function safeGet(data) {
	try {
		if (typeof JSON.parse(data) == "object") {
			return true;
		}
	} catch (e) {
		that.log(e);
		that.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
		return false;
	}
}

function jsonParse(str) {
	if (typeof str == "string") {
		try {
			return JSON.parse(str);
		} catch (e) {
			that.log(e);
			$.msg($.name, "", "不要在BoxJS手动复制粘贴修改cookie");
			return [];
		}
	}
}
彩
