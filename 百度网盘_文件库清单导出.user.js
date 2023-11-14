// ==UserScript==
// @name         百度网盘文件库目录导出
// @namespace    https://github.com/liong911/BaidunNetDisk-script
// @version      1.0.2
// @description  适用于新版本百度网盘文件库目录导出的篡改猴脚本。js牛逼！
// @author       liong
// @license      MIT
// @match        https://pan.baidu.com/disk*
// @run-at       document-start
// @grant        unsafeWindow
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.3/FileSaver.min.js
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// ==/UserScript==

(function() {
    'use strict'
    // Your code here...

    var fileInfo = ''
    var startTime
    var checkUrl = []
    var statistic = 0
    var size = 0
    var pageSize = 500
    function init() {
        fileInfo = ''
        startTime = new Date()
        checkUrl = []
        statistic = 0
    }

    function exportDir() {
        init()

        let selectedList = $("tr[class='im-pan-table__body-row mouse-choose-item selected']")
        for (let i = 0; i < selectedList.length; i++) {
            let selected = selectedList[i];
            let fs_id = selected.dataset.id
            query(fs_id, 1)
        }

        let gb = size / 1024 / 1024 / 1024
        let mb = size / 1024 / 1024
        let result = `总耗时：${new Date().getTime() - startTime.getTime()}ms\n`
            + `共导出资源数：${statistic}\n`
            + `共计资源大小：${gb.toFixed(2)}GB = ${mb.toFixed(2)}MB`
        console.log(result)
        fileInfo = result + '\n\n' + fileInfo
        var blob = new Blob([fileInfo], {type: "text/plaincharset=utf-8"})
        saveAs(blob, "exportDirList.txt")
    }

    function query(fs_id, pageNo) {
        let gid_url = `https://pan.baidu.com/mbox/msg/shareinfo?page=${pageNo}&num=${pageSize}&fs_id=${fs_id}&from_uk=${from_uk}&msg_id=${msg_id}&type=2&gid=${gid}&limit=50&desc=1&clienttype=0&app_id=250528&web=1&dp-logid=${dp_logid}`
        if (checkUrl.indexOf(gid_url) > -1) {
            console.log(`请求重复：${gid_url}`)
            throw new Error(`请求重复：${gid_url}`)
        }
        $.ajax({
            type:'GET',
            url: gid_url,
            data:{},
            dataType: "json",
            async: false,
            success: (res) => {
                console.log(`url：`, gid_url)
                // console.log(`返回结果：`, res)
                if (res.errno != 0) {
                    console.error('获取异常', res)
                }
                let hasMore = res.has_more
                addFileInfo(res.records)
                if (hasMore === 1) {
                    query(fs_id, pageNo + 1)
                }
            },
            error:function(err){
                console.error(err)
            }
        })
    }

    // 定义分隔符
    var SPLITTER = ', '
    var tipsCount = 500
    function addFileInfo(records) {
        if (records == null || records.length == 0) {
            return
        }

        for (let i = 0; i < records.length; i++) {
            let record = records[i]
            if (record.isdir == 0) {
                let mb = record.size / 1024 / 1024
                fileInfo += record.server_filename + SPLITTER + record.path + SPLITTER + mb.toFixed(2) + SPLITTER + record.fs_id + '\n'
                statistic++
                size += record.size
                if (statistic % tipsCount === 0) {
                    console.log(`累计导出资源数：${statistic}`)
                    let gb = size / 1024 / 1024 / 1024
                    let mb = size / 1024 / 1024
                    console.log(`累计资源大小：${gb.toFixed(2)}GB = ${mb.toFixed(2)}MB`)
                    let time = new Date().getTime() - startTime.getTime();
                    console.log(`累计耗时：${time}ms，开始时间：${startTime}`)
                }
            } else {
                query(record.fs_id, 1)
            }
        }
    }

    function getUrlParamsByName(str, name) {
        // \b 边界
        // ?<= 向后匹配
        // 字符串转成正则表达式，其中的'\b'类型的特殊字符要多加一个'\'
        let reg = new RegExp(`(?<=\\b${name}=)[^&]*`)
        let target = str.match(reg)

        if(target) {
            return target[0]
        }

        return
    }

    var gid = ''
    var changeFlag = false
    var from_uk = ''
    var msg_id = ''
    var dp_logid = ''
    const originOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (_, url) {
        if (url.indexOf("/mbox/group/listshare") >= 0) {
            console.log(url)
            let gidNew = getUrlParamsByName(url, 'gid')
            if (gid != gidNew) {
                changeFlag = true
                gid = gidNew
                console.log('拿到[gid]啦，玲宝O(∩_∩)O哈哈~：' + gid)
            }
        }
        if (url.indexOf("/mbox/msg/shareinfo") >= 0 && from_uk.length <= 0) {
            console.log(url)
            from_uk = getUrlParamsByName(url, 'from_uk')
            console.log('拿到[from_uk]啦，玲宝O(∩_∩)O哈哈~：' + from_uk)
        }
        if (url.indexOf("/mbox/msg/shareinfo") >= 0 && changeFlag) {
            console.log(url)
            msg_id = getUrlParamsByName(url, 'msg_id')
            console.log('拿到[msg_id]啦，玲宝O(∩_∩)O哈哈~：' + msg_id)
            dp_logid = getUrlParamsByName(url, 'dp-logid')
            console.log('拿到[dp_logid]啦，玲宝O(∩_∩)O哈哈~：' + dp_logid)
            console.log('准备就绪啦，可以开始导出啦，玲宝O(∩_∩)O哈哈~')
            changeFlag = false
        }

        originOpen.apply(this, arguments)
    }

    var $dropdownbutton = $('<button type="button" class="u-button u-button--default u-button--mini"><span>导出</span></button>')
    $dropdownbutton.click(exportDir)
    var task = setInterval(() => {
        var buttons = $("div[class='im-file-nav__operate']")
        if (buttons.text().indexOf('导出') < 0) {
            buttons.append($dropdownbutton)
        }
    }, 2000)

})()
