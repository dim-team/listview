/**
 * 列表模块
 **/
var $ = require('zepto');
//var template = require('template');
var template;
var runtime = require('runtime');
var Clearout = require('clearout');
//
var uid = 0;
/**
 * 列表的类
 * @class Listview
 * @constructor
 * @param {object} options
 * @extends Listview.prototype
 **/
var Listview = function (options) {
        var _this = this;
        this.id = ++uid;
        this.options = $.extend({
            dataRequestHandler: function () {},
            dataFormatHandler: null,
            dataSortHandler: function (data) {
                return data;
            },
            templateHandlers: {},
            templateExternalDatas: {},
            page: null,
            pagesize: 10,
            totalpage: 1,
            template: '',
            usePager: true,
            useAsyncData: true,
            container: null,
            preload: true,
            renderMode: Listview.RenderMode.APPEND,
            clearout: true,
            clearoutPreRend: 5,
            listItem: 'li',
            onPageChanged: function (page) {},
            onPageRended: function () {},
            onPageRemove: function () {}
        }, options);
        this.page = this.options.page;
        this.pagesize = this.options.pagesize;
        this.totalpage = this.options.totalpage;
        this.dataStorage = null;
        this.completed = !this.options.useAsyncData;
        this.displayedPages = [];

        if (this.options.clearout) {
            this.clearout = new Clearout({
                container: $(this.options.container),
                listItem: this.options.listItem,
                preRend: this.options.clearoutPreRend
            });
        }

        Listview.Instances[this.id] = this;
    }
    /**
     * 列表类的原型对象
     * @class Listview.prototype
     * @static
     **/
Listview.prototype = {
    /**
     * 获取分页数据
     * @method getPageData
     * @param {function} callback 回调
     **/
    getPageData: function (callback, page) {
        if (!this.options.useAsyncData && typeof this.options.dataSortHandler === 'function') {
            this.dataStorage = this.options.dataSortHandler.call(this, this.dataStorage);
        }
        var _this = this,
            requestHandler = this.options.dataRequestHandler,
            page = typeof page != 'undefined' ? page : this.page,
            pagesize = this.options.pagesize,
            pageData = [];
        if (this.dataStorage) {
            pageData = this.dataStorage.slice(page * pagesize, (page + 1) * pagesize);
            pageData = this.removeEmptyItem(pageData);
        }
        //console.log(pageData);
        if (pageData.length == 0 && !this.completed) {
            requestHandler(page, pagesize, function (totalpage, data, external) {
                _this.setTotalPage(totalpage);
                data = _this.options.dataSortHandler.call(_this, data);
                /*
                if(page == _this.totalpage - 1){
                    _this.completed = true;
                }
                */
                $.extend(_this.options.templateExternalDatas, external);
                if (!_this.dataStorage) {
                    _this.dataStorage = new Array(pagesize * totalpage);
                }
                _this.dataStorage.splice.apply(_this.dataStorage, [page * pagesize, pageData.length].concat(data));
                callback(_this.dataStorage.slice(page * pagesize, (page + 1) * pagesize));
            });
        } else {
            callback(pageData);
        }
    },
    preload: function (page) {
        this.getPageData(function () {}, page);
    },
    /**
     * 显示分页
     * @method showPage
     * @param {Number} page 第几页
     **/
    showPage: function (page) {
        var _this = this;
        page = Math.max(1, Math.min(page || 1, this.totalpage));
        if (this.page == page) {
            return false;
        }
        this.page = page;
        //console.log(this.page);
        this.getPageData(function (data) {
            _this.renderPage(data);
            _this.displayedPages.push(page);
            if (_this.options.preload && _this.page < _this.totalpage - 1) {
                _this.preload(_this.page + 1);
            }
        });
    },
    nextPage: function () {
        console.log(this.page);
        var page = this.page + 1;
        if(page > this.totalpage){
            return;
        }
        this.showPage(page);
    },
    prevPage: function () {
        var page = this.page - 1;
        if(page < 1){
            return;
        }
        this.showPage(page);
    },
    /**
     * 渲染分页
     * @method renderPage
     * @param {object} data
     **/
    renderPage: function (data, renderMode) {
        //console.log(this, data);
        //过滤空元素
        //debugger;
        data = this.removeEmptyItem(data);
        renderMode = renderMode || this.options.renderMode;
        var formatHandler = this.options.dataFormatHandler;
        if (typeof formatHandler === 'function') {
            $.each(data, function (_, o) {
                o = formatHandler(o);
            });
        }
        // console.log(data);
        var content = template(this.options.template)({
                handler: $.extend(this.options.templateHandlers, {
                    console: window.console
                }),
                external: this.options.templateExternalDatas,
                datas: data,
                startIndex: this.page * this.pagesize,
                page: this.page
            }),
            container = $(this.options.container);

        switch (renderMode) {
        case Listview.RenderMode.REPLACE:
            container.html(content);
            break;
        case Listview.RenderMode.APPEND:
            container.append(content);
            break;
        case Listview.RenderMode.PREPEND:
            container.prepend(content);
            break;
        }
        this.options.onPageRended.call(this, data);

    },
    /**
     * 设置总页数
     * @method setTotalPage
     * @param {Number} totalpage 总页数
     **/
    setTotalPage: function (totalpage) {
        if (totalpage != this.totalpage) {
            this.totalpage = totalpage;
            if (this.options.useAsyncData) {
                this.completed = false;
            }
        }
    },
    /**
     * 去除空元素
     * @method removeEmptyItem
     * @param {object} data
     **/
    removeEmptyItem: function (data) {
        var temp = [];
        $.each(data, function (i, o) {
            if (o) {
                temp.push(o);
            }
        });
        data = temp;
        return data;
    },
    /**
     * 在头部添加数据
     * @method unshift
     * @param {object} data
     **/
    unshift: function (data) {
        if (!this.dataStorage) {
            this.dataStorage = [];
        }
        if (!this.dataStorage[0]) {
            this.dataStorage[0] = data;
        } else {
            this.dataStorage.unshift(data);
        }
    },
    reset: function () {
        this.page = 1;
        this.dataStorage = null;
        this.totalpage = 1;
        $(this.options.container).html('');
    },
    destroy: function (isRefresh) {
        this.page = null;
        this.dataStorage = null;
        this.totalpage = null;
        if(!isRefresh){
            return;
        }
        this.options = null;
        if (this.clearout) {
            this.clearout.destroy();
            this.clearout = null;
        }

        Listview.Instances[this.id] = null;
        delete Listview.Instances[this.id];
    },
    /**
     *滚动事件
     *预加载N屏数据
    **/
    scroll:function(basepage,prepage){
        var that = this;
        prepage ++;
        basepage.bind(window, 'scroll', function(obj) {
            if (obj.scrollTop >= (obj.scrollHeight - obj.windowHeight * prepage)) {
                that.nextPage();
            }
        });
    },
    reRender: function(){
        this.reset();
        //this.showPage();

    }
};

Listview.RenderMode = {
    REPLACE: 1,
    APPEND: 2,
    PREPEND: 3
};

Listview.Instances = {};

module.exports = Listview;
