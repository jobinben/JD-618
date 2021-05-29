/*
美丽研究院
更新时间:2021-05-08
活动入口：京东app首页-美妆馆-底部中间按钮
只支持Node.js支持N个京东账号
脚本兼容: Node.js
cron 1 7,12,19 * * * jd_beauty.js
 */
const $ = new Env('美丽研究院');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const WebSocket = require('ws');
//const WebSocket = $.isNode() ? require('websocket').w3cwebsocket: SockJS;
let jdNotify = true;//是否关闭通知，false打开通知推送，true关闭通知推送
const randomCount = $.isNode() ? 20 : 5;
$.accountCheck = true;
$.init = false;
// const bean = 1; //兑换多少豆，默认是500
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', message, helpInfo, ADD_CART = false;

if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
const JD_API_HOST = 'https://api.m.jd.com/client.action';
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
    return;
  }
  if (!$.isNode()) {
    $.msg($.name, 'iOS端不支持websocket，暂不能使用此脚本', '');
    return
  }
  helpInfo = []
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      message = '';
      await TotalBean();
      console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/`, {"open-url": "https://bean.m.jd.com/"});

        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      await accountCheck();
      while (!$.hasDone) {
        await $.wait(1000)
      }
      if ($.accountCheck) {
        await jdBeauty();
      }
      if ($.accountCheck) {
        helpInfo = $.helpInfo;
      }
    }
  }
})()
  .catch((e) => {
    $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
  })
  .finally(() => {
    $.done();
  })

async function accountCheck() {
  $.hasDone = false;
  console.log(`***检测账号是否黑号***`);
  await getIsvToken()
  await getIsvToken2()
  await getToken()
  if (!$.token) {
    console.log(`\n\n提示：请尝试换服务器ip或者设置"xinruimz-isv.isvjcloud.com"域名直连，或者自定义UA再次尝试(环境变量JD_USER_AGENT)\n\n`)
    process.exit(0);
    return
  }
  let client = new WebSocket(`wss://xinruimz-isv.isvjcloud.com/wss/?token=${$.token}`, null, {
    headers: {
      'user-agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;10.0.2;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
    }
  });
  client.onopen = async () => {
    console.log(`美容研究院服务器连接成功`);
    client.send('{"msg":{"type":"action","args":{"source":1},"action":"_init_"}}');
    await $.wait(1000);
    client.send(`{"msg":{"type":"action","args":{"source":1},"action":"get_user"}}`);
  };
  client.onmessage = async function (e) {
    if (e.data !== 'pong' && e.data && safeGet(e.data)) {
      let vo = JSON.parse(e.data);
      if (vo.action === "_init_") {
        let vo = JSON.parse(e.data);
        if (vo.msg === "风险用户") {
          $.accountCheck = false;
          // $.init=true;
          client.close();
          console.log(`${vo.msg}，跳过此账号`)
        }
      } else if (vo.action === "get_user") {
        // $.init=true;
        $.accountCheck = true;
        client.close();
        console.log(`${vo.msg}，账号正常`);
      }
    }
    client.onclose = (e) => {
      $.hasDone = true;
      // console.log(client.readyState);
      console.log('服务器连接关闭');
    };
    await $.wait(1000);
  }
}

async function jdBeauty() {
  $.hasDone = false
  // await getIsvToken()
  // await getIsvToken2()
  // await getToken()
  // if (!$.token) {
  //   console.log(`\n\n提示：请尝试换服务器ip或者设置"xinruimz-isv.isvjcloud.com"域名直连，或者自定义UA再次尝试(环境变量JD_USER_AGENT)\n\n`)
  //   return
  // }
  await mr()
  while (!$.hasDone) {
    await $.wait(1000)
  }
  await showMsg();
}

async function mr() {
  $.coins = 0
  let positionList = ['b1', 'h1', 's1', 'b2', 'h2', 's2']
  $.tokens = []
  $.pos = []
  $.helpInfo = []
  $.needs = []
  let client = new WebSocket(`wss://xinruimz-isv.isvjcloud.com/wss/?token=${$.token}`,null,{
    headers:{
      'user-agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;10.0.2;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
    }
  })
  console.log(`wss://xinruimz-isv.isvjcloud.com/wss/?token=${$.token}`)
  client.onopen = async () => {
    console.log(`美容研究院服务器连接成功`);
    client.send('{"msg":{"type":"action","args":{"source":1},"action":"_init_"}}');
    client.send(`{"msg":{"type":"action","args":{"source":"meizhuangguandibudaohang"},"action":"stats"}}`)
    while (!$.init) {
      client.send(`ping`)
      await $.wait(1000)
    }
    console.log('helpInfo', helpInfo);
    for (let help of helpInfo) {
      client.send(help);
    }
    await $.wait(1000)
    client.send(`{"msg":{"type":"action","args":{},"action":"shop_products"}}`)
    // 获得可生产的原料列表
    client.send(`{"msg":{"type":"action","args":{},"action":"get_produce_material"}}`)
    await $.wait(1000)
    // 获得正在生产的商品信息
    client.send('{"msg":{"type":"action","args":{},"action":"product_producing"}}')
    await $.wait(1000)
    // 获得库存
    client.send(`{"msg":{"type":"action","args":{},"action":"get_package"}}`)
    // 获得可生成的商品列表
    client.send(`{"msg":{"type":"action","args":{"page":1,"num":10},"action":"product_lists"}}`)
    await $.wait(1000)

    // 获得原料生产列表
    console.log(`========原料生产信息========`)
    for (let pos of positionList) {
      client.send(`{"msg":{"type":"action","args":{"position":"${pos}"},"action":"produce_position_info_v2"}}`)
      // await $.wait(500)
    }

    // 获得任务
    // client.send(`{"msg":{"type":"action","args":{},"action":"get_task"}}`)
    // 获取个人信息
    client.send(`{"msg":{"type":"action","args":{"source":1},"action":"get_user"}}`)
    await $.wait(1000)
    // 获得福利中心
    client.send(`{"msg":{"type":"action","args":{},"action":"get_benefit"}}`)
    client.send(`{"msg":{"type":"action","args":{},"action":"collect_coins"}}`);
  };

  client.onclose = () => {
    console.log(`本次运行获得美妆币${$.coins}`)
    console.log('服务器连接关闭');
    $.init = true;
    $.hasDone = true;
    for (let i = 0; i < $.pos.length && i < $.tokens.length; ++i) {
      $.helpInfo.push(`{"msg":{"type":"action","args":{"inviter_id":"${$.userInfo.id}","position":"${$.pos[i]}","token":"${$.tokens[i]}"},"action":"employee"}}`)
    }
  };
  client.onmessage = async function (e) {
    if (e.data !== 'pong' && e.data && safeGet(e.data)) {
      let vo = JSON.parse(e.data);
      await $.wait(Math.random()*2000+500);
      console.log(`\n开始任务："${JSON.stringify(vo.action)}`);
      switch (vo.action) {
        case "get_ad":
          console.log(`当期活动：${vo.data.screen.name}`)
          if (vo.data.check_sign_in === 1) {
            // 去签到
            console.log(`去做签到任务`)
            client.send(`{"msg":{"type":"action","args":{},"action":"sign_in"}}`)
            client.send(`{"msg":{"action":"write","type":"action","args":{"action_type":1,"channel":2,"source_app":2}}}`)
          }
          break
        case "get_user":
          $.userInfo = vo.data
          $.total = vo.data.coins
          if ($.userInfo.newcomer === 0) {
            console.log(`去做新手任务`)
            for (let i = $.userInfo.step; i < 15; ++i) {
              client.send(`{"msg":{"type":"action","args":{},"action":"newcomer_update"}}`)
              await $.wait(500)
            }
          } else
            $.init = true;
          $.level = $.userInfo.level;
          console.log(`当前美妆币${$.total}，用户等级${$.level}`);
          break;
        case "shop_products":
          let count = $.taskState.shop_view.length;
          if (count < 5) console.log(`去做关注店铺任务`);
          for (let i = 0; i < vo.data.shops.length && count < 5; ++i) {
            const shop = vo.data.shops[i];
            if (!$.taskState.shop_view.includes(shop.id)) {
              count++;
              console.log(`去做关注店铺【${shop.name}】`);
              client.send(`{"msg":{"type":"action","args":{"shop_id":${shop.id}},"action":"shop_view"}}`);
              client.send(`{"msg":{"action":"write","type":"action","args":{"action_type":6,"channel":2,"source_app":2,"vender":"${shop.vender_id}"}}}`);
            }
            await $.wait(1000);
          }
          count = $.taskState.product_adds.length;
          if (count < 5 && ADD_CART) console.log(`去做浏览并加购任务`)
          for (let i = 0; i < vo.data.products.length && count < 5 && ADD_CART; ++i) {
            const product = vo.data.products[i];
            if (!$.taskState.product_adds.includes(product.id)) {
              count++;
              console.log(`去加购商品【${product.name}】`);
              client.send(`{"msg":{"type":"action","args":{"add_product_id":${product.id}},"action":"add_product_view"}}`);
              client.send(`{"msg":{"action":"write","type":"action","args":{"action_type":9,"channel":2,"source_app":2,"vender":"${product.id}"}}}`);
              client.send(`{"msg":{"action":"write","type":"action","args":{"action_type":5,"channel":2,"source_app":2,"vender":"${product.id}"}}}`);
            }
            await $.wait(1000)
          }
          for (let i = $.taskState.meetingplace_view; i < $.taskState.mettingplace_count; ++i) {
            console.log(`去做第${i + 1}次浏览会场任务`)
            client.send(`{"msg":{"type":"action","args":{"source":1},"action":"meetingplace_view"}}`)
            await $.wait(2000)
          }
          if ($.taskState.today_answered === 0) {
            console.log(`去做每日问答任务`)
            client.send(`{"msg":{"type":"action","args":{"source":1},"action":"get_question"}}`)
          }
          break
        case "check_up":
          $.taskState = vo.data
          // 6-9点签到
          for (let check_up of vo.data.check_up) {
            if (check_up['receive_status'] !== 1) {
              console.log(`去领取第${check_up.times}次签到奖励`)
              client.send(`{"msg":{"type":"action","args":{"check_up_id":${check_up.id}},"action":"check_up_receive"}}`)
            } else {
              console.log(`第${check_up.times}次签到奖励已领取`)
            }
          }
          break
        case 'newcomer_update':
          if (vo.code === '200' || vo.code === 200) {
            console.log(`第${vo.data.step}步新手任务完成成功，获得${vo.data.coins}美妆币`)
            if (vo.data.step === 15) $.init = true
            if (vo.data.coins) $.coins += vo.data.coins
          } else {
            console.log(`新手任务完成失败，错误信息：${JSON.stringify(vo)}`)
          }
          break
        case 'get_question':
          const questions = vo.data
          let commit = {}
          for (let i = 0; i < questions.length; ++i) {
            const ques = questions[i]
            commit[`${ques.id}`] = parseInt(ques.answers)
          }
          await $.wait(5000)
          client.send(`{"msg":{"type":"action","args":{"commit":${JSON.stringify(commit)},"correct":${questions.length}},"action":"submit_answer"}}`)
          break
        case 'complete_task':
        case 'action':
        case 'submit_answer':
        case "check_up_receive":
        case "shop_view":
        case "add_product_view":
        case "meetingplace_view":
          if (vo.code === '200' || vo.code === 200) {
            console.log(`任务完成成功，获得${vo.data.coins}美妆币`)
            if (vo.data.coins) $.coins += vo.data.coins
            $.total = vo.data.user_coins
          } else {
            console.log(`任务完成失败，错误信息${vo.msg}`)
          }
          break
        case "produce_position_info_v2":
          // console.log(`${Boolean(vo?.data)};${vo?.data?.material_name !== ''}`);
          if (vo.data && vo.data.material_name !== '') {
            console.log(`【${vo?.data?.position}】上正在生产【${vo?.data?.material_name}】，可收取 ${vo.data.produce_num} 份`)
            if (new Date().getTime() > vo.data.procedure.end_at) {
              console.log(`去收取${vo?.data?.material_name}`)
              client.send(`{"msg":{"type":"action","args":{"position":"${vo?.data?.position}","replace_material":false},"action":"material_fetch_v2"}}`)
              client.send(`{"msg":{"type":"action","args":{},"action":"to_employee"}}`)
              $.pos.push(vo?.data?.position)
            }
          } else {
            if (vo?.data && vo.data.valid_electric > 0) {
              console.log(`【${vo.data.position}】上尚未开始生产`)
              let ma
              console.log(`$.needs:${JSON.stringify($.needs)}`);
              if($.needs.length){
                ma = $.needs.pop()
                console.log(`ma:${JSON.stringify(ma)}`);
              } else {
                ma = $.material.base[0]['items'][positionList.indexOf(vo.data.position)];
                console.log(`elsema:${JSON.stringify(ma)}`);
              }
              console.log(`ma booleam${Boolean(ma)}`);
              if (ma) {
                console.log(`去生产${ma.name}`)
                client.send(`{"msg":{"type":"action","args":{"position":"${vo.data.position}","material_id":${ma.id}},"action":"material_produce_v2"}}`)
              } else {
                ma = $.material.base[1]['items'][positionList.indexOf(vo.data.position)]
                if (ma) {
                  console.log(`else去生产${ma.name}`)
                  client.send(`{"msg":{"type":"action","args":{"position":"${vo.data.position}","material_id":${ma.id}},"action":"material_produce_v2"}}`)
                }
              }
            }
            else{
              console.log(`【${vo.data.position}】电力不足`)
            }
          }
          break
        case "material_produce_v2":
          console.log(`【${vo.data.position}】上开始生产${vo?.data?.material_name}`)
          client.send(`{"msg":{"type":"action","args":{},"action":"to_employee"}}`)
          $.pos.push(vo.data.position)
          break
        case "material_fetch_v2":
          if (vo.code === '200' || vo.code === 200) {
            console.log(`【${vo.data.position}】收取成功，获得${vo.data.procedure.produce_num}份${vo.data.material_name}\n`);
          } else {
            console.log(`任务完成失败，错误信息${vo.msg}`)
          }
          break
        case "get_package":
          if (vo.code === '200' || vo.code === 200) {
            // $.products = vo.data.product
            $.materials = vo.data.material
            let msg = `仓库信息:`
            for (let material of $.materials) {
              msg += `【${material.material.name}】${material.num}份 `
            }
            console.log(msg)
          } else {
            console.log(`仓库信息获取失败，错误信息${vo.msg}`)
          }
          break
        case "product_lists":
          let need_material = []
          if (vo.code === '200' || vo.code === 200) {
            $.products = vo.data.filter(vo=>vo.level===$.level)
            console.log(`========可生产商品信息========`)
            for (let product of $.products) {
              let num = Infinity
              let msg = ''
              msg += `生产【${product.name}】`
              for (let material of product.product_materials) {
                msg += `需要原料“${material.material.name}${material.num} 份” ` //material.num 需要材料数量
                const ma = $.materials.filter(vo => vo.item_id === material.material_id)[0] //仓库里对应的材料信息
                // console.log(`ma:${JSON.stringify(ma)}`);
                if (ma) {
                  msg += `（库存 ${ma.num} 份）`;
                  num = Math.min(num, Math.trunc(ma.num / material.num)) ;//Math.trunc 取整数部分
                  if(material.num > ma.num){need_material.push(material.material)};
                  // console.log(`num:${JSON.stringify(num)}`);
                } else {
                  if(need_material.findIndex(vo=>vo.id===material.material.id)===-1)
                    need_material.push(material.material)
                  console.log(`need_material:${JSON.stringify(need_material)}`);
                  msg += `(没有库存)`
                  num = -1000
                }
              }
              if (num !== Infinity && num > 0) {
                msg += `，可生产 ${num}份`
                console.log(msg)
                console.log(`【${product.name}】可生产份数大于0，去生产`)
                //product_produce 产品研发里的生产
                client.send(`{"msg":{"type":"action","args":{"product_id":${product.id},"amount":${num}},"action":"product_produce"}}`)
                await $.wait(500)
              } else {
                console.log(msg)
                console.log(`【${product.name}】原料不足，无法生产`)
              }
            }
            $.needs = need_material
            // console.log(`product_lists $.needs:${JSON.stringify($.needs)}`);
            console.log(`=======================`)
          } else {
            console.log(`生产信息获取失败，错误信息：${vo.msg}`)
          }
          // await $.wait(2000);
          // client.close();
          break
        case "product_produce":
          if (vo.code === '200' || vo.code === 200) {
            // 
