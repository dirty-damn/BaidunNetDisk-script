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

    const Mode = {
        FILE: 1,
        EXCEL: 2
    };
    
    const config = {
        // 请求分页每页500条
        pageSize: 500,
        // 每500条打印一次日志
        tipsCount: 500,
        
        exportMode: {
            mode: Mode.FILE,
            file: {
                SPLITTER: ', '
            },
            excel: {}
        }
    }
    
    var exportInfo = {
        content: [],
        statistic: {
            fileCount: 0,
            fileSize: 0,
            startTime: new Date(),
        },
        
        exportSelectedDir: function() {
            exportInfo.init()
            exportInfo.exportEveryDir()
            exportInfo.save()
        },
        init: function() {
            this.content = []

            this.statistic.fileCount = 0
            this.statistic.fileSize = 0
            this.statistic.startTime = new Date()
        },
        exportEveryDir: function() {
            let selectedList = $("tr[class='im-pan-table__body-row mouse-choose-item selected']")
            for (let i = 0; i < selectedList.length; i++) {
                let selected = selectedList[i];
                let fsId = selected.dataset.id
                this.loopQueryPage(fsId, 1)
            }
        },
        loopQueryPage: function (fsId, pageNo) {
            let gidUrl = `https://pan.baidu.com/mbox/msg/shareinfo?page=${pageNo}&num=${config.pageSize}&fs_id=${fsId}&from_uk=${authInfo.fromUk}&msg_id=${authInfo.msgId}&type=2&gid=${authInfo.gid}&limit=50&desc=1&clienttype=0&app_id=250528&web=1&dp-logid=${authInfo.dpLogid}`
            $.ajax({
                type:'GET',
                url: gidUrl,
                data:{},
                dataType: "json",
                async: false,
                success: (res) => {
                    console.log(`url：`, gidUrl)
                    if (res.errno != 0) {
                        console.error('获取异常', res)
                    }
                    let hasMore = res.has_more
                    this.processBiz(res.records)
                    if (hasMore === 1) {
                        this.loopQueryPage(fsId, pageNo + 1)
                    }
                },
                error:function(err){
                    console.error(err)
                }
            })
        },
        processBiz: function(records) {
            if (records == null || records.length == 0) {
                return
            }

            for (let i = 0; i < records.length; i++) {
                let record = records[i]
                if (record.isdir == 0) {
                   this.doBiz(record)
                } else {
                    this.loopQueryPage(record.fs_id, 1)
                }
            }
        },
        doBiz: function(record) {
            let fileMb = record.size / 1024 / 1024
            let fileObj = {
                name: record.server_filename,
                path: record.path,
                size: fileMb.toFixed(2),
                fsId: record.fs_id,
                localMtime: record.local_mtime,
                serverMtime: record.server_mtime
            }
            this.content.push(fileObj)

            // 计数
            this.recordStatistic(record)
        },
        recordStatistic: function(record) {
            this.statistic.fileCount++
            this.statistic.fileSize += record.size
            if (this.statistic.fileCount % config.tipsCount === 0) {
                console.log(`累计导出资源数：${this.statistic.fileCount}`)
                let gb = this.statistic.fileSize / 1024 / 1024 / 1024
                let mb = this.statistic.fileSize / 1024 / 1024
                console.log(`累计资源大小：${gb.toFixed(2)}GB = ${mb.toFixed(2)}MB`)
                let time = new Date().getTime() - this.statistic.startTime.getTime();
                console.log(`累计耗时：${time}ms，开始时间：${this.statistic.startTime}`)
            }
        },
        save: function() {
            // 打印执行结果
            let result = this.printResult()
            
            if (config.exportMode.mode === Mode.FILE) {
                this.writeToFile(result)
            } 
            
            if (config.exportMode.mode === Mode.FILE)  {
                this.writeToExcel(result)
            }
        },
        printResult: function() {
            let gb = this.statistic.fileSize / 1024 / 1024 / 1024
            let mb = this.statistic.fileSize / 1024 / 1024
            let result = `总耗时：${new Date().getTime() - this.statistic.startTime.getTime()}ms\n`
                + `共导出资源数：${this.statistic.statistic}\n`
                + `共计资源大小：${gb.toFixed(2)}GB = ${mb.toFixed(2)}MB`
            console.log(result)

            return result
        },
        writeToFile: function(result) {
            let contentStr = result + '\n\n'
            for (let i = 0; i < this.content.length; i++) {
                let fileObj = this.content[i]
                // 资源名称, 路径, 大小MB，网盘资源的fs_id
                contentStr += fileObj.name + config.exportMode.file.SPLITTER + fileObj.path + config.exportMode.file.SPLITTER + fileObj.size + config.exportMode.file.SPLITTER + fileObj.fsId + '\n'
            }
            
            let blob = new Blob([contentStr], {type: "text/plaincharset=utf-8"})
            saveAs(blob, "exportDirList.txt")
        },
        writeToExcel: function(result) {
            // TODO: 导出excel
        },
    }
    
    let authInfo = {
        gid: '',
        fromUk: '',
        msgId: '',
        dpLogid: '',
        isChangeFileFolder: false,
        
        init: function() {
            this.initAuthInfo()
            this.addExportButton()
        },
        initAuthInfo: function() {
            let _this = this
            const originOpen = XMLHttpRequest.prototype.open
            XMLHttpRequest.prototype.open = function (_, url) {
                _this.clickGroupFileLibrary(url)
                _this.clickOneFileFolder(url)
                originOpen.apply(this, arguments)
            }
        },
        addExportButton: function() {
            let $dropdownbutton = $('<button type="button" class="u-button u-button--default u-button--mini"><span>导出</span></button>')
            $dropdownbutton.click(exportInfo.exportSelectedDir)
            var task = setInterval(() => {
                var buttons = $("div[class='im-file-nav__operate']")
                if (buttons.text().indexOf('导出') < 0) {
                    buttons.append($dropdownbutton)
                }
            }, 2000)
        },
        clickGroupFileLibrary: function(url) {
            if (url.indexOf("/mbox/group/listshare") >= 0) {
                let gidNew = this.getUrlParamValueByName(url, 'gid')
                if (authInfo.gid != gidNew) {
                    authInfo.isChangeFileFolder = true
                    authInfo.gid = gidNew
                    console.log('准备进度[1/4]，拿到[gid]啦，玲宝O(∩_∩)O哈哈~：' + authInfo.gid)
                }
            }
        },
        clickOneFileFolder: function(url) {
            if (url.indexOf("/mbox/msg/shareinfo") >= 0 && authInfo.fromUk.length <= 0) {
                authInfo.fromUk = this.getUrlParamValueByName(url, 'from_uk')
                console.log('准备进度[2/4]，拿到[from_uk]啦，玲宝O(∩_∩)O哈哈~：' + authInfo.fromUk)
            }

            if (url.indexOf("/mbox/msg/shareinfo") >= 0 && authInfo.isChangeFileFolder) {
                authInfo.msgId = this.getUrlParamValueByName(url, 'msg_id')
                console.log('准备进度[3/4]，拿到[msg_id]啦，玲宝O(∩_∩)O哈哈~：' +authInfo. msgId)
                authInfo.dpLogid = this.getUrlParamValueByName(url, 'dp-logid')
                console.log('准备进度[4/4]，拿到[dp_logid]啦，玲宝O(∩_∩)O哈哈~：' + authInfo.dpLogid)
                console.log('准备完成，可以开始导出啦，玲宝O(∩_∩)O哈哈~')
                authInfo.isChangeFileFolder = false
            }
        },
        getUrlParamValueByName: function(url, name) {
            // \b 边界
            // ?<= 向后匹配
            // 字符串转成正则表达式，其中的'\b'类型的特殊字符要多加一个'\'
            let reg = new RegExp(`(?<=\\b${name}=)[^&]*`)
            let target = url.match(reg)

            if(target) {
                return target[0]
            }

            return
        }
    }
    authInfo.init()
})()
