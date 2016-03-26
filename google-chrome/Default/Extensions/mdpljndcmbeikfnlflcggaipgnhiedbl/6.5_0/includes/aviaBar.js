(typeof mono === 'undefined') && (mono = {loadModule: function() {this.loadModuleStack.push(arguments);},loadModuleStack: []});

mono.loadModule('aviaBar', function(moduleName, initData) {
  "use strict";
  var language = initData.getLanguage;
  var debug = false;
  var profile = mono.global.aviaBarProfile;
  var hostname = location.hostname;

  var components = SaveFrom_Utils;

  if (components.mutationWatcher.isAvailable()) {
    setTimeout(function() {
      main.run();
    });
  }

  var errorMap = {
    LOW_PRICE_IS_NOT_FOUND: 10,
    REQUEST_ABORTED: 11,
    PAGE_DATA_CHANGE: 12,
    AIRPORTS_PARSE_ERROR: 20,
    AIRPORTS_BAD_RESPONSE: 21,
    CITIES_PARSE_ERROR: 30,
    CITIES_BAD_RESPONSE: 31,
    CCY_PARSE_ERROR: 40,
    CCY_EMPTY_RESPONSE: 41,
    CCY_NOT_SUPPORT: 42,
    AVIA_R1_PARSE_ERROR: 50,
    AVIA_R1_EMPTY_RESPONSE: 51,
    AVIA_R1_FAIL: 52,
    AVIA_R1_EMPTY_DATA: 53,
    AVIA_R3_PARSE_ERROR: 60,
    AVIA_R3_EMPTY_RESPONSE: 61,
    HOTEL_EMPTY_RESPONSE: 70,
    AVIA_R4_PARSE_ERROR: 80,
    AVIA_R4_EMPTY_RESPONSE: 81,
    AVIA_R4_EMPTY_DATA: 82,
    AVIA_CAL_PARSE_ERROR: 90,
    AVIA_CAL_EMPTY_RESPONSE: 91,
    AVIA_CAL_EMPTY_DATA: 92,
    AVIA_CAL_DATE_PRICE_EMPTY: 93,
    AVIA_CAL_MONTH_PRICE_EMPTY: 94
  };

  var error = function() {
    if (!debug) return;
    var args = [].slice.call(arguments);
    args.unshift('sfsf');
    console.error.apply(console, args);
  };

  var log = function() {
    if (!debug) return;
    var args = [].slice.call(arguments);
    args.unshift('sfsf');
    console.trace.apply(console, args);
  };

  log('Profile', profile);

  var main = {
    storage: null,
    cache: {},
    onGetAviaData: function(pageInfo) {
      var _this = this;

      var checkData = function() {
        return !!(pageInfo.origin && pageInfo.destination && pageInfo.currency && pageInfo.price && pageInfo.dateStart);
      };

      if (!checkData()) {
        log('Data is not ready', pageInfo);
        return;
      }

      log('Info', pageInfo);

      if (pageInfo.barRequestData) {
        return;
      }
      pageInfo.barRequestData = true;

      var currentBar = main.bar.current;
      if (currentBar) {
        main.clearInfoObj(pageInfo);
      }

      var onAbort = function(event) {
        var eventName = 'discard';
        if (event === 'betterPrice') {
          eventName = event;
        }
        mono.sendMessage({
          action: 'trackEvent',
          category: 'cheapflight',
          event: eventName,
          label: hostname,
          params: {tid: 'UA-70432435-1', noRewrite: true}
        });

        var index = errorMap[event];
        if (index && mono.isGM) {
          var label = [index, pageInfo.origin, pageInfo.destination, pageInfo.price, pageInfo.currency, pageInfo.dateStart, pageInfo.dateEnd || ''].join(';');
          mono.sendMessage({
            action: 'trackEvent',
            category: 'cheapflightError',
            event: hostname,
            label: label,
            params: {tid: 'UA-7055055-10', noRewrite: true}
          });
        }
      };

      mono.sendMessage({
        action: 'trackEvent',
        category: 'cheapflight',
        event: 'requestData',
        label: hostname,
        params: {tid: 'UA-70432435-1', cd: 'flightrequestdata', noRewrite: true}
      });

      mono.sendMessage({
        action: 'trackScreen',
        screen: 'flightrequestdata',
        params: {tid: 'UA-70432435-1'}
      });

      this.bar.isAborted = false;
      this.requestData(pageInfo, function(err, data) {
        if (_this.bar.isAborted) {
          currentBar && currentBar.close();
          log('Aborted!');
          onAbort('REQUEST_ABORTED');
          return;
        }

        if (!checkData()) {
          currentBar && currentBar.close();
          error('Data is not ready', pageInfo);
          onAbort('PAGE_DATA_CHANGE');
          return;
        }

        if (err) {
          currentBar && currentBar.close();
          onAbort(err);
          return;
        }

        var lowerPrice = null;
        var needConverting = !main.isSupportedCcy(pageInfo.currency);
        data.prices.data.forEach(function(item) {
          var value = null;
          if (needConverting) {
            value = item.converted_value = main.convertCcy(item.value, pageInfo.currency);
          } else {
            value = item.value;
          }

          if (!value) {
            return;
          }

          if (lowerPrice === null || lowerPrice > value) {
            lowerPrice = value;
          }
        });

        if (lowerPrice === null) {
          error('Low price is not found!', pageInfo.price);
          currentBar && currentBar.close();
          onAbort('LOW_PRICE_IS_NOT_FOUND');
          return;
        }

        mono.sendMessage({
          action: 'trackEvent',
          category: 'cheapflight',
          event: 'responseData',
          label: hostname,
          params: {tid: 'UA-70432435-1', cd: 'flightresponsedata', noRewrite: true}
        });

        mono.sendMessage({
          action: 'trackScreen',
          screen: 'flightresponsedata',
          params: {tid: 'UA-70432435-1'}
        });

        if (lowerPrice > pageInfo.price) {
          log('Has lower price!', lowerPrice, pageInfo.price);
          if (!debug) {
            currentBar && currentBar.close();
            onAbort('betterPrice');
            return;
          }
        }

        var details = {};
        details.type = 'avia';
        details.prices = data.prices;
        details.pageInfo = pageInfo;

        main.bar.create(details);
      });
    },
    onGetHotelData: function(pageInfo) {
      var _this = this;

      var checkData = function() {
        return !!(pageInfo.name && pageInfo.query && pageInfo.dateIn && pageInfo.dateOut && pageInfo.currency && pageInfo.adults && pageInfo.price);
      };

      if (!checkData()) {
        log('Data is not ready', pageInfo);
        return;
      }

      log('Info', pageInfo);

      if (pageInfo.barRequestData) {
        return;
      }
      pageInfo.barRequestData = true;

      var currentBar = main.bar.current;
      if (currentBar) {
        main.clearInfoObj(pageInfo);
      }

      var onAbort = function(event) {
        var eventName = 'discard';
        if (event === 'betterPrice') {
          eventName = event;
        }
        mono.sendMessage({
          action: 'trackEvent',
          category: 'hotel',
          event: eventName,
          label: hostname,
          params: {tid: 'UA-70432435-1', noRewrite: true}
        });

        var index = errorMap[event];
        if (index && mono.isGM) {
          var query = pageInfo.query[0];
          var label = [index, language.lang, pageInfo.dateIn, pageInfo.dateOut, pageInfo.adults, pageInfo.price, pageInfo.currency, query].join(';');
          mono.sendMessage({
            action: 'trackEvent',
            category: 'hotelError',
            event: hostname,
            label: label,
            params: {tid: 'UA-7055055-10', noRewrite: true}
          });
        }
      };

      mono.sendMessage({
        action: 'trackEvent',
        category: 'hotel',
        event: 'requestData',
        label: hostname,
        params: {tid: 'UA-70432435-1', cd: 'hotelrequestdata', noRewrite: true}
      });

      mono.sendMessage({
        action: 'trackScreen',
        screen: 'hotelrequestdata',
        params: {tid: 'UA-70432435-1'}
      });

      this.bar.isAborted = false;
      this.requestHotelData(pageInfo, function(err, data) {
        if (_this.bar.isAborted) {
          currentBar && currentBar.close();
          log('Aborted!');
          onAbort('REQUEST_ABORTED');
          return;
        }

        if (!checkData()) {
          currentBar && currentBar.close();
          error('Data is not ready', pageInfo);
          onAbort('PAGE_DATA_CHANGE');
          return;
        }

        if (err) {
          currentBar && currentBar.close();
          onAbort(err);
          return;
        }

        var lowerPrice = null;
        var needConverting = !main.isSupportedCcy(pageInfo.currency);
        data.prices.data.forEach(function(item) {
          var value = null;
          if (needConverting) {
            value = item.converted_value = main.convertCcy(item.value, pageInfo.currency);
          } else {
            value = item.value;
          }

          if (!value) {
            return;
          }

          if (lowerPrice === null || lowerPrice > value) {
            lowerPrice = value;
          }
        });

        if (lowerPrice === null) {
          error('Low price is not found!', pageInfo.price);
          currentBar && currentBar.close();
          onAbort('LOW_PRICE_IS_NOT_FOUND');
          return;
        }

        mono.sendMessage({
          action: 'trackEvent',
          category: 'hotel',
          event: 'responseData',
          label: hostname,
          params: {tid: 'UA-70432435-1', cd: 'hotelresponsedata', noRewrite: true}
        });

        mono.sendMessage({
          action: 'trackScreen',
          screen: 'hotelresponsedata',
          params: {tid: 'UA-70432435-1'}
        });

        if (lowerPrice > pageInfo.price) {
          log('Has lower price!', lowerPrice, pageInfo.price);
          if (!debug) {
            currentBar && currentBar.close();
            onAbort('betterPrice');
            return;
          }
        }

        var details = {};
        details.type = 'hotel';
        details.prices = data.prices;
        details.pageInfo = pageInfo;

        main.bar.create(details);
      });
    },
    onGetData: function() {
      var pageInfo = this.getInfoObj();

      if (pageInfo.type === 'hotel') {
        return this.onGetHotelData(pageInfo);
      } else {
        return this.onGetAviaData(pageInfo);
      }
    },
    run: function() {
      mono.storage.get(['aviaBar'], function(storage) {
        main.storage = storage.aviaBar || {};
        main.storage.blackList = main.storage.blackList || [];

        if (!main.bar.isAllow()) {
          return;
        }

        var template = main.profileList[profile];
        if (!template) {
          log('Template is not found!', profile);
          return;
        }

        return template.call(main);
      });
    },
    save: function(cb) {
      mono.storage.set({aviaBar: main.storage}, cb);
    }
  };

  mono.extend(main, {
    defaultCcy: 'RUB',
    supportedCcy: ['USD', 'EUR', 'RUB'],
    isSupportedCcy: function(value) {
      return main.supportedCcy.indexOf(value) !== -1;
    },
    requestAirports: function(cb) {
      mono.sendMessage({
        action: 'getData',
        url: 'http://api.travelpayouts.com/data/airports.json'
      }, function(responseText) {
        var response = null;
        try {
          response = JSON.parse(responseText);
        } catch(e){
          error('Parse error!', responseText);
          return cb('AIRPORTS_PARSE_ERROR');
        }

        if (!Array.isArray(response)) {
          error('Response is not array!', responseText);
          return cb('AIRPORTS_BAD_RESPONSE');
        }

        response = response.filter(function(item) {
          return item.code && item.city_code;
        });

        cb(null, response);
      });
    },
    requestCities: function(cb) {
      mono.sendMessage({
        action: 'getData',
        url: 'http://api.travelpayouts.com/data/cities.json'
      }, function(responseText) {
        var response = null;
        try {
          response = JSON.parse(responseText);
        } catch(e){
          error('Parse error!', responseText);
          return cb('CITIES_PARSE_ERROR');
        }

        if (!Array.isArray(response)) {
          error('Response is not array!', responseText);
          return cb('CITIES_BAD_RESPONSE');
        }

        response = response.filter(function(item) {
          return item.code && item.name;
        });

        cb(null, response);
      });
    },
    requestCcy: function(cb) {
      mono.sendMessage({
        action: 'getData',
        url: 'http://engine.aviasales.ru/currencies/all_currencies_rates'
      }, function(responseText) {
        var response = null;
        try {
          response = JSON.parse(responseText);
        } catch(e){
          error('Parse error!', responseText);
          return cb('CCY_PARSE_ERROR');
        }

        if (!response) {
          error('Response is empty!', responseText);
          return cb('CCY_EMPTY_RESPONSE');
        }

        cb(null, response);
      });
    },
    requestPrices: function(pageInfo, origCb) {
      var trackError = function(event) {
        var index = errorMap[event];
        if (index && mono.isGM) {
          var label = [index, pageInfo.origin, pageInfo.destination, pageInfo.price, pageInfo.currency, pageInfo.dateStart, pageInfo.dateEnd || ''].join(';');
          mono.sendMessage({
            action: 'trackEvent',
            category: 'cheapflightError',
            event: hostname,
            label: label,
            params: {tid: 'UA-7055055-10', noRewrite: true}
          });
        }
      };

      var cb = function(err, data) {
        if (!err) {
          return origCb(err, data);
        }

        setTimeout(function() {
          trackError(err);
        }, 0);

        if (pageInfo.dateEnd) {
          return main.requestCalPrices(pageInfo, origCb);
        }

        return main.requestMonthPrices(pageInfo, function(err, data) {
          if (!err) {
            return origCb(err, data);
          }

          main.requestCalPrices(pageInfo, origCb);

          trackError(err);
        });
      };

      if (!pageInfo.dateEnd) {
        return main.requestPrices3(pageInfo, cb);
      }

      return main.requestPrices1(pageInfo, cb);
    },
    requestMonthPrices: function(pageInfo, cb) {
      main.supportedCcy = ['RUB'];

      var data = {
        origin_iata: pageInfo.origin,
        destination_iata: pageInfo.destination,
        direct_date: pageInfo.dateStart,
        affiliate: true,
        adults: 1
      };

      mono.sendMessage({
        action: 'getData',
        url: 'http://min-prices-go.aviasales.ru/month_minimal_price.json?' + mono.param(data)
      }, function(responseText) {
        var data = null;
        try {
          data = JSON.parse(responseText);
        } catch(e){
          error('Parse error!', responseText);
          return cb('AVIA_R4_PARSE_ERROR');
        }

        if (!data) {
          error('Response is empty!', responseText);
          cb('AVIA_R4_EMPTY_RESPONSE');
          return;
        }

        if (!data.direct && !data.not_direct) {
          error('Eempty data!', data);
          cb('AVIA_R4_EMPTY_DATA');
          return;
        }

        var value = data.direct || data.not_direct;
        if (data.direct && data.not_direct && data.direct > data.not_direct) {
          value = data.not_direct;
        }

        data = {
          origin: pageInfo.origin,
          destination: pageInfo.destination,
          value: value,
          depart_date: pageInfo.dateStart,
          return_date: pageInfo.dateEnd,
          monthPrice: true
        };

        var response = {
          data: [data]
        };

        return cb(null, response);
      });
    },
    requestCalPrices: function(pageInfo, cb) {
      main.supportedCcy = ['RUB'];

      var requestData = {
        origin: pageInfo.origin,
        destination: pageInfo.destination,
        depart_date: pageInfo.dateStart,
        one_way: !pageInfo.dateEnd
      };

      var getEndDate = function() {
        var startTime = (new Date(pageInfo.dateStart)).getTime();

        var endDate = startTime + 30 * 24 * 60 * 60 * 1000;

        var now = new Date(endDate);
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        if (month < 10) {
          month = '0' + month;
        }
        var date = now.getDate();
        if (date < 10) {
          date = '0' + date;
        }

        return [year, month, date].join('-');
      };

      var getMonthPrice = function(priceList, cb) {
        var startDate = pageInfo.dateStart;
        var endDate = getEndDate();

        priceList = priceList.filter(function(item) {
          if (!item.value || !item.depart_date) {
            return false;
          }

          if (pageInfo.dateEnd) {
            return item.depart_date >= startDate && item.return_date < endDate;
          } else {
            return item.depart_date >= startDate && item.depart_date < endDate;
          }
        });

        if (priceList.length === 0) {
          error('Cal month price is not found!');
          cb('AVIA_CAL_MONTH_PRICE_EMPTY');
          return;
        }

        var value = Math.round(priceList.reduce(function(previousValue, item) {
          return previousValue + item.value;
        }, 0) / priceList.length);

        var obj = {
          origin: pageInfo.origin,
          destination: pageInfo.destination,
          value: value,
          depart_date: pageInfo.dateStart,
          monthPrice: true
        };

        if (pageInfo.dateEnd) {
          obj.return_date = pageInfo.dateEnd;
        }

        return cb(null, {
          data: [obj]
        });
      };

      var getPrices = function(priceList, cb) {
        priceList = priceList.filter(function(item) {
          if (!item.value || !item.depart_date || !item.origin || !item.destination) {
            return false;
          }

          if (pageInfo.dateEnd) {
            return item.depart_date === pageInfo.dateStart && item.return_date === pageInfo.dateEnd;
          } else {
            return item.depart_date === pageInfo.dateStart;
          }
        });

        if (priceList.length === 0) {
          error('Cal date price is not found!');
          cb('AVIA_CAL_DATE_PRICE_EMPTY');
          return;
        }

        var list = priceList.map(function(item) {
          var obj = {
            destination: item.destination,
            origin: item.origin,
            value: item.value,
            depart_date: item.depart_date
          };

          if (pageInfo.dateEnd) {
            obj.return_date = item.return_date
          }

          return obj;
        });

        return cb(null, {
          data: list
        });
      };

      mono.sendMessage({
        action: 'getData',
        url: 'http://min-prices.aviasales.ru/calendar_preload?' + mono.param(requestData)
      }, function(responseText) {
        var response = null;
        try {
          response = JSON.parse(responseText);
        } catch(e){
          error('Parse error!', responseText);
          return cb('AVIA_CAL_PARSE_ERROR');
        }

        if (!response) {
          error('Response is empty!', responseText);
          return cb('AVIA_CAL_EMPTY_RESPONSE');
        }

        var currentDepartDatePrices = response.current_depart_date_prices || [];
        if (currentDepartDatePrices.length === 0) {
          currentDepartDatePrices = null;
        }

        var priceList = currentDepartDatePrices || response.best_prices || [];
        if (priceList.length === 0) {
          error('Cal data is empty!', response);
          return cb('AVIA_CAL_EMPTY_DATA');
        }

        return getPrices(currentDepartDatePrices || [], function(err, data) {
          if (!err) {
            return cb(err, data);
          }

          return getMonthPrice(priceList, function(err, data) {
            return cb(err, data);
          });
        });
      });
    },
    requestPrices1: function(pageInfo, cb) {
      main.supportedCcy = ['USD', 'EUR', 'RUB'];

      var data = {
        origin: pageInfo.origin,
        destination: pageInfo.destination,
        currency: pageInfo.currency,
        depart_date: pageInfo.dateStart
      };

      if (pageInfo.dateEnd) {
        data.return_date = pageInfo.dateEnd;
      }

      if (!main.isSupportedCcy(pageInfo.currency)) {
        data.currency = main.defaultCcy;
      }

      data.token = 'd936b4f899d2e26969269dd587f90a67';

      mono.sendMessage({
        action: 'getData',
        url: 'http://api.travelpayouts.com/v1/prices/cheap?' + mono.param(data)
      }, function(responseText) {
        var response = null;
        try {
          response = JSON.parse(responseText);
        } catch(e){
          error('Parse error!', responseText);
          return cb('AVIA_R1_PARSE_ERROR');
        }

        if (!response) {
          error('Response is empty!', response);
          cb('AVIA_R1_EMPTY_RESPONSE');
          return;
        }

        if (!response.success || !response.data) {
          error('API is not success!', response);
          cb('AVIA_R1_FAIL');
          return;
        }

        var _list = [];
        for (var cityCode in response.data) {
          var list = response.data[cityCode];
          for (var index in list) {
            var item = list[index];
            if (!item.price || !item.departure_at) {
              continue;
            }

            var _item = {};
            _item.destination = cityCode;
            _item.origin = pageInfo.origin;
            _item.value = item.price;
            _item.depart_date = item.departure_at;
            if (pageInfo.dateEnd) {
              _item.return_date = item.return_at;
            }
            _list.push(_item);
          }
        }

        if (_list.length === 0) {
          error('API data is empty!', response);
          cb('AVIA_R1_EMPTY_DATA');
          return;
        }

        response.data = _list;

        cb(null, response);
      });
    },
    requestPrices3: function(pageInfo, cb) {
      main.supportedCcy = ['RUB'];

      var data = {
        origin: pageInfo.origin,
        destination: pageInfo.destination,
        depart_date: pageInfo.dateStart
      };

      if (pageInfo.dateEnd) {
        data.return_date = pageInfo.dateEnd;
      }

      mono.sendMessage({
        action: 'getData',
        url: 'http://min-prices.aviasales.ru/day_price?' + mono.param(data)
      }, function(responseText) {
        var data = null;
        try {
          data = JSON.parse(responseText);
        } catch(e){
          error('Parse error!', responseText);
          return cb('AVIA_R3_PARSE_ERROR');
        }

        if (!data || !data.destination || !data.origin || !data.value || !data.depart_date) {
          error('Response is empty!', responseText);
          cb('AVIA_R3_EMPTY_RESPONSE');
          return;
        }

        var response = {
          data: [data]
        };

        cb(null, response);
      });
    },
    requestHotelPrices: function(pageInfo, cb) {
      var _this = this;
      var index = 0;

      var _cb = function (err, response) {
        index++;
        if (err && pageInfo.query[index]) {
          _this.requestHotelQueryPrices(pageInfo, index, _cb);
        } else {
          cb(err, response);
        }
      };

      return this.requestHotelQueryPrices(pageInfo, index, _cb);
    },
    requestHotelQueryPrices: function(pageInfo, index, cb) {
      main.supportedCcy = ['RUB'];

      var data = {
        hotel_name: pageInfo.query[index],
        locale: language.lang,
        checkin: pageInfo.dateIn,
        checkout: pageInfo.dateOut,
        adults: pageInfo.adults
      };

      data.marker = 89756;
      data.host = 'h.savefrom.net';
      data.callback = 'price';

      mono.sendMessage({
        action: 'getData',
        url: 'https://yasen.hotellook.com/tp/v1/check_hotel_price_by_name.json?' + mono.param(data)
      }, function(responseText) {
        var data = null;
        mono.findJson(responseText || '', [/"deeplink":/, /"price":/]).some(function(obj) {
          data = obj;
          return true;
        });

        if (!data || !data.price || !data.deeplink) {
          error('Response is empty!', responseText);
          cb('HOTEL_EMPTY_RESPONSE');
          return;
        }

        data.value = data.price;
        delete data.price;

        var response = {
          data: [data]
        };
        cb(null, response);
      });
    },
    requestHotelData: function(pageInfo, cb) {
      var fired = false;
      var data = {};

      var n = 0;
      var r = 0;
      var onReady = function(err) {
        if (fired) {
          return;
        }

        if (err) {
          fired = true;
          return cb(err);
        }

        r++;
        if (r !== n) {
          return;
        }

        fired = true;
        cb(null, data);
      };

      n++;
      main.requestHotelPrices(pageInfo, function(err, prices) {
        if (err) {
          return onReady(err);
        }

        if (!main.isSupportedCcy(pageInfo.currency)) {
          n++;
          var ccySupport = function() {
            var ccyList = main.cache.ccyList;
            if (ccyList[pageInfo.currency.toLowerCase()] === undefined) {
              error('Currency is not support!', pageInfo.currency);
              onReady('CCY_NOT_SUPPORT');
              return;
            }

            onReady();
          };

          if (main.cache.ccyList) {
            mono.asyncCall(function() {
              ccySupport();
            });
          } else {
            n++;
            main.requestCcy(function (err, ccyList) {
              if (err) {
                onReady(err);
                return;
              }

              main.cache.ccyList = ccyList;
              onReady();

              ccySupport();
            });
          }
        }

        data.prices = prices;
        onReady();
      });
    },
    requestData: function(pageInfo, cb) {
      var fired = false;
      var data = {};

      var n = 0;
      var r = 0;
      var onReady = function(err) {
        if (fired) {
          return;
        }

        if (err) {
          fired = true;
          return cb(err);
        }

        r++;
        if (r !== n) {
          return;
        }

        fired = true;
        cb(null, data);
      };

      n++;
      main.requestPrices(pageInfo, function(err, prices) {
        if (err) {
          return onReady(err);
        }

        if (!main.cache.cityMap) {
          n++;
          main.requestCities(function (err, cityList) {
            if (err) {
              return onReady(err);
            }

            var cityMap = main.cache.cityMap = {};
            cityList.forEach(function(item) {
              cityMap[item.code] = item;
            });
            onReady();
          });
        }

        if (!main.isSupportedCcy(pageInfo.currency)) {
          n++;
          var ccySupport = function() {
            var ccyList = main.cache.ccyList;
            if (ccyList[pageInfo.currency.toLowerCase()] === undefined) {
              error('Currency is not support!', pageInfo.currency);
              onReady('CCY_NOT_SUPPORT');
              return;
            }

            onReady();
          };

          if (main.cache.ccyList) {
            mono.asyncCall(function() {
              ccySupport();
            });
          } else {
            n++;
            main.requestCcy(function (err, ccyList) {
              if (err) {
                onReady(err);
                return;
              }

              main.cache.ccyList = ccyList;
              onReady();

              ccySupport();
            });
          }
        }

        if (!main.cache.airportMap) {
          n++;
          main.requestAirports(function (err, airportList) {
            if (err) {
              onReady(err);
              return;
            }

            var airportMap = main.cache.airportMap = {};
            airportList.forEach(function(item) {
              airportMap[item.code] = item;
            });
            onReady();
          });
        }

        data.prices = prices;
        onReady();
      });
    }
  });

  mono.extend(main, {
    bar: {
      getCloseBtn: function() {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var svgNS = svg.namespaceURI;
        svg.setAttribute('width', '19.799');
        svg.setAttribute('height', '19.799');
        svg.setAttribute('viewBox', '0 0 19.7989899 19.7989899');

        var path = document.createElementNS(svgNS, 'path');
        svg.appendChild(path);
        path.setAttribute('d', 'M8.092 9.9L5.146 6.952C4.544 6.35 4.45 5.45 4.95 4.95c.5-.5 1.4-.406 2.003.196L9.9 8.092l2.946-2.946c.61-.61 1.504-.695 2.003-.196.498.5.412 1.394-.197 2.003L11.707 9.9l2.946 2.946c.602.602.695 1.504.196 2.003-.5.498-1.402.405-2.004-.197L9.9 11.707l-2.947 2.946c-.61.61-1.504.695-2.003.196-.5-.5-.413-1.395.196-2.004L8.092 9.9z');
        path.setAttribute('fill', '#534B6A');
        path.setAttribute('opacity', '.3');
        path.setAttribute('fill-rule', 'evenodd');

        return svg;
      },
      getTwoWayLines: function() {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var svgNS = svg.namespaceURI;
        svg.setAttribute('width', '41px');
        svg.setAttribute('height', '24px');
        svg.setAttribute('viewBox', '0 0 41 24');

        var g = document.createElementNS(svgNS, 'g');
        svg.appendChild(g);
        g.setAttribute('stroke-linecap', 'square');
        g.setAttribute('stroke', '#979797');
        g.setAttribute('stroke-width', '2');
        g.setAttribute('fill', 'none');
        g.setAttribute('fill-rule', 'evenodd');

        var path = document.createElementNS(svgNS, 'path');
        g.appendChild(path);
        path.setAttribute('d', 'M40.33 18H2.24M6 13L.724 18.1 6 23.2');

        path = document.createElementNS(svgNS, 'path');
        g.appendChild(path);
        path.setAttribute('d', 'M.67 5h38.09M35 0l5.276 5.1L35 10.2');

        return svg;
      },
      getOneWayLine: function() {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var svgNS = svg.namespaceURI;
        svg.setAttribute('width', '105px');
        svg.setAttribute('height', '11px');
        svg.setAttribute('viewBox', '0 0 105 11');

        var g = document.createElementNS(svgNS, 'g');
        svg.appendChild(g);
        g.setAttribute('stroke-linecap', 'square');
        g.setAttribute('stroke', '#979797');
        g.setAttribute('stroke-width', '2');
        g.setAttribute('fill', 'none');
        g.setAttribute('fill-rule', 'evenodd');

        var path = document.createElementNS(svgNS, 'path');
        g.appendChild(path);
        path.setAttribute('d', 'M.823 5H102.76M99 0l5.276 5.1L99 10.2');

        return svg;
      },
      prepareItem: function(pageInfo, item) {
        var obj = null;
        if (pageInfo.type === 'hotel') {
          obj = {
            name: pageInfo.name,
            value: item.converted_value || item.value,
            dateIn: pageInfo.dateIn,
            dateOut: pageInfo.dateOut,
            currency: pageInfo.currency,
            link: item.deeplink
          };
        } else {
          obj = {
            origin: item.origin,
            destination: item.destination,
            value: item.converted_value || item.value,
            dateStart: item.depart_date,
            dateEnd: item.return_date,
            currency: pageInfo.currency,
            monthPrice: !!item.monthPrice
          };
        }

        return obj;
      },
      isAllow: function() {
        var blackList = main.storage.blackList;

        var blackListItem = null;
        blackList.some(function(item) {
          if (item.hostname === hostname) {
            blackListItem = item;
            return true;
          }
        });

        if (!blackListItem) {
          return true;
        }

        var now = parseInt(Date.now() / 1000);
        if (blackListItem.expire > now) {
          return false;
        }

        var pos = blackList.indexOf(blackListItem);
        blackList.splice(pos, 1);

        main.save();

        return true;
      },
      marginPage: function(details, barHeight) {
        var html = document.body.parentNode;
        main.pageStyle = main.pageStyle || {};

        if (barHeight) {
          var bar = details.barEl;
          main.pageStyle.marginTop = html.style.marginTop;
          main.pageStyle.transition = html.style.transition;

          html.style.transition = 'margin-top 0.2s';
          bar.style.transition = 'margin-top 0.2s';

          setTimeout(function() {
            html.style.marginTop = barHeight + 'px';
            bar.style.marginTop = 0;
          });

          setTimeout(function() {
            html.style.transition = main.pageStyle.transition;
            bar.style.transition = '';
          }, 250);

          var onShow = main.currentProfile.onShow;
          onShow && onShow(barHeight);
        } else {
          html.style.marginTop = main.pageStyle.marginTop;

          var onHide = main.currentProfile.onHide;
          onHide && onHide();
        }
      },
      onReplace: function(oldDetails, details) {
        window.removeEventListener('resize', oldDetails.onResize);

        if (details.barEl) {
          details.barEl.style.marginTop = 0;
        }
        
        ['barEl', 'styleEl'].forEach(function(item) {
          var node = oldDetails[item];
          var newNode = details[item];
          var parent;
          if (node && (parent = node.parentNode)) {
            parent.replaceChild(newNode, node);
          }
        });
      },
      onClose: function(details, byUser) {
        ['barEl', 'styleEl'].forEach(function(item) {
          var node = details[item];
          var parent;
          if (node && (parent = node.parentNode)) {
            parent.removeChild(node);
          }
        });
        window.removeEventListener('resize', details.onResize);

        main.bar.marginPage(details);

        if (byUser) {
          main.stopObserver();

          var blackList = main.storage.blackList;
          var now = parseInt(Date.now() / 1000);
          blackList.push({hostname: hostname, expire: now + 5 * 60 * 60});

          main.save();
        }
      },
      getStyle: function(details) {
        return mono.create('style', {
          text: mono.style2Text([
            {
              selector: '#' + details.rndId,
              style: mono.extendPos({}, mono.styleReset, {
                font: 'normal normal 14px Arial, sans-serif',
                backgroundColor: '#F4F4F4',
                width: '100%',
                position: 'fixed',
                top: 0,
                left: 0,
                marginTop: (-details.barHeight) + 'px',
                boxShadow: '0 0 1px rgba(0, 0, 0, 0.5)',
                fontWeight: 'normal',
                display: 'block',
                color: '#000'
              }),
              append: {
                '.sf-cell': {
                  display: 'table-cell',
                  verticalAlign: 'middle',
                  height: details.barHeight + 'px'
                },
                '.sf-center': {
                  textAlign: 'center'
                },
                '.sf-right': {
                  textAlign: 'right'
                },
                '.sf-close-btn': {
                  display: 'inline-block',
                  textDecoration: 'none',
                  width: '22px',
                  height: '22px'
                },
                '.sf-close-btn:hover path': {
                  opacity: '.8'
                },
                '.sf-nowrap': {
                  whiteSpace: 'nowrap'
                },
                '.sf-label': {
                  color: '#0082AD'
                },
                '.sf-point': {
                  fontSize: '18px'
                },
                '.sf-place': {
                  fontSize: 'inherit'
                },
                '.sf-price': {
                  color: '#24B000',
                  fontSize: '26px',
                  fontWeight: 'bold'
                },
                '.sf-view-btn': {
                  fontSize: '14px',
                  backgroundColor: '#24B000',
                  padding: '7px 18px',
                  color: '#fff',
                  display: 'inline-block',
                  borderRadius: '4px',
                  height: '32px',
                  boxSizing: 'border-box',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap'
                },
                '.sf-view-btn:hover': {
                  backgroundColor: '#1F9600'
                }
              }
            }
          ])
        });
      },
      getLang: function() {
        var lang = {
          ru: {
            foundOneWay: 'Найден билет дешевле:',
            foundTwoWay: 'Билеты дешевле:',
            view: 'Посмотреть',
            origin: 'Туда:',
            destination: 'Обратно:',
            close: 'Закрыть',

            foundHotel: 'Найдена лучшая цена:',
            checkIn: 'Дата заезда:',
            checkOut: 'Дата отъезда:',

            inMonth: 'в %month%',
            calLabel: 'Выгодное предложение!'
          },
          en: {
            foundOneWay: 'Found a better price:',
            foundTwoWay: 'Better price:',
            view: 'Learn more',
            origin: 'Depart:',
            destination: 'Return:',
            close: 'Close',

            foundHotel: 'Found a better price:',
            checkIn: 'Check-in:',
            checkOut: 'Check-out:',

            inMonth: 'in %month%',
            calLabel: 'Get a better deal!'
          }
        };

        return lang[language.lang] || lang.en;
      },
      getFontSizeSandbox: function() {
        var sandbox = mono.create('div', {
          style: mono.extendPos({}, mono.styleReset, {
            font: 'normal normal 12px Arial, sans-serif',
            position: 'absolute',
            opacity: 0,
            top: 0,
            left: 0
          })
        });

        document.body.appendChild(sandbox);

        return {
          getNodeSize: function(node, cb) {
            sandbox.appendChild(node);
            return setTimeout(function(){
              var clientWidth = window.getComputedStyle(node, null).getPropertyValue("width");
              clientWidth = Math.ceil(parseFloat(clientWidth));
              return cb(clientWidth);
            }, 0);
          },
          remove: function() {
            sandbox.parentNode.removeChild(sandbox);
          }
        }
      },
      calcBlockSize: function(blocks, cb) {
        var _this = this;
        var defaultStyle = {
          display: 'inline-block',
          whiteSpace: 'nowrap'
        };

        var sandbox = null;

        var ready = 0;
        var wait = 0;

        var onReady = function() {
          ready++;
          if (wait !== ready) {
            return;
          }
          sandbox && sandbox.remove();

          Object.keys(blocks).forEach(function(key) {
            var block = blocks[key];

            var width = null;
            if (!block.fontSizeWidth) {
              width = block.width;
            } else {
              block.widthList = [];
              var maxWidth = 999999;
              var keys = Object.keys(block.fontSizeWidth);
              keys.reverse().forEach(function (fontSize) {
                var minWidth = (block.fontSizeWidth[fontSize] || block.width.default) + (block.width.plus || 0);
                var obj = {
                  fontSize: parseFloat(fontSize),
                  minWidth: minWidth,
                  maxWidth: maxWidth
                };
                maxWidth = minWidth;
                block.widthList.push(obj);
              });
              delete block.fontSizeWidth;
              width = block.widthList[0].minWidth;
              block.widthList.slice(-1)[0].minWidth = 0;
              if (block.widthList.length === 1) {
                block.width = width;
                delete block.widthList;
              }
            }

            block.node.style.width = width + 'px';
          });

          return cb();
        };

        wait++;
        Object.keys(blocks).forEach(function(key) {
          var block = blocks[key];
          if (!block.width || !block.width.strings) {
            return;
          }

          if (!sandbox) {
            sandbox = _this.getFontSizeSandbox();
          }

          if (!Array.isArray(block.width.fontSize)) {
            block.width.fontSize = [block.width.fontSize];
          }

          block.fontSizeWidth = {};
          block.width.strings.forEach(function(text) {
            block.width.fontSize.forEach(function(fontSize) {
              wait++;
              return sandbox.getNodeSize(mono.create('span', {
                text: text,
                style: mono.extend({}, defaultStyle, {
                  fontSize: fontSize + 'px'
                }, block.width.fontStyle)
              }), function (size) {
                var cSize = block.fontSizeWidth[fontSize];
                if (cSize === undefined || cSize < size) {
                  block.fontSizeWidth[fontSize] = size;
                }
                return onReady();
              });
            });
          });
        });

        onReady();
      },
      aviaBarCreate: function(details, oldBar) {
        var prices = details.prices;
        var pageInfo = details.pageInfo;

        var mainItemIndex = main.getBarItemIndex(prices.data);
        if (mainItemIndex === -1) {
          error('Bar item is not found!', details);
          return;
        }

        var lang = main.bar.getLang();
        var isOneWay = !pageInfo.dateEnd;

        var mainItem = main.bar.prepareItem(pageInfo, prices.data[mainItemIndex]);
        var isCalendar = !!mainItem.monthPrice;

        var priceObj = main.getPrice(mainItem.currency, mainItem.value);

        var strings = {
          price: priceObj.string,
          pointA: main.getCityName(mainItem.origin),
          pointB: main.getCityName(mainItem.destination),
          view: lang.view
        };

        if (!strings.pointA || !strings.pointB) {
          error('City name is not defined!', mainItem);
          return;
        }

        var blocks = {};

        blocks.closeBlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-center']
          }),
          closeBtn: mono.create('a', {
            class: 'sf-close-btn',
            href: '#close',
            title: lang.close,
            append: [
              main.bar.getCloseBtn()
            ],
            on: ['click', function(e) {
              e.preventDefault();

              details.close(1);

              mono.sendMessage({
                action: 'trackEvent',
                category: 'cheapflight',
                event: 'close',
                label: hostname,
                params: {tid: 'UA-70432435-1', noRewrite: true}
              });
            }]
          }),
          width: 36,
          leftFixed: 1
        };
        blocks.closeBlock.node.appendChild(blocks.closeBlock.closeBtn);

        blocks.leftResizeBlock = {
          node: mono.create('div', {
            class: ['sf-cell']
          }),
          width: 0
        };

        if (isCalendar) {
          strings.calLabel = lang.calLabel;

          blocks.calLabel = {
            node: mono.create('div', {
              class: ['sf-cell', 'sf-label'],
              text: strings.calLabel
            }),
            width: {
              strings: [
                strings.calLabel
              ],
              fontSize: 14,
              default: 200
            },
            leftFixed: 1
          };
        } else
        if (isOneWay) {
          strings.foundOneWay = lang.foundOneWay;
          strings.dateStart = main.getDate(mainItem.dateStart);

          blocks.dateBlock = {
            node: mono.create('div', {
              class: ['sf-cell'],
              append: [
                mono.create('div', {
                  class: ['sf-label'],
                  text: strings.foundOneWay
                }),
                mono.create('div', {
                  class: ['sf-date'],
                  text: strings.dateStart
                })
              ]
            }),
            width: {
              strings: [
                strings.foundOneWay,
                strings.dateStart
              ],
              fontSize: 14,
              default: 200
            },
            leftFixed: 1
          };
        } else {
          strings.foundTwoWay = lang.foundTwoWay;

          blocks.dateFoundBlock = {
            node: mono.create('div', {
              class: ['sf-cell', 'sf-label', 'sf-right'],
              text: strings.foundTwoWay
            }),
            width: {
              strings: [
                strings.foundTwoWay
              ],
              fontSize: 14,
              default: 120
            },
            leftFixed: 1
          };

          strings.origin = lang.origin + String.fromCharCode(160);
          strings.destination = lang.destination + String.fromCharCode(160);

          blocks.dateLabesBlock = {
            node: mono.create('div', {
              class: ['sf-cell'],
              append: [
                mono.create('div', {
                  class: ['sf-right'],
                  text: strings.origin
                }),
                mono.create('div', {
                  class: ['sf-right'],
                  text: strings.destination
                })
              ]
            }),
            width: {
              strings: [
                strings.origin,
                strings.destination
              ],
              fontSize: 14,
              plus: 10,
              default: 80
            },
            leftFixed: 1
          };

          strings.dateStart = main.getDate(mainItem.dateStart);
          strings.dateEnd = main.getDate(mainItem.dateEnd);

          blocks.dateBlock = {
            node: mono.create('div', {
              class: ['sf-cell'],
              append: [
                mono.create('div', {
                  class: ['sf-nowrap'],
                  text: strings.dateStart
                }),
                mono.create('div', {
                  class: ['sf-nowrap'],
                  text: strings.dateEnd
                })
              ]
            }),
            width: {
              strings: [
                strings.dateStart,
                strings.dateEnd
              ],
              fontSize: 14,
              default: 100
            },
            leftFixed: 1
          };
        }

        if (isCalendar) {
          strings.calMonth = main.getCalMonth(mainItem.dateStart);
          strings.calMonth = lang.inMonth.replace('%month%', strings.calMonth);

          var inlineArrow = null;
          var plusWidth = 0;
          if (isOneWay) {
            inlineArrow = main.bar.getOneWayLine();
            plusWidth = 140;
          } else {
            inlineArrow = main.bar.getTwoWayLines();
            plusWidth = 75;
          }
          inlineArrow.style.display = 'block';

          blocks.calendarCanterBlock = {
            node: mono.create('div', {
              class: ['sf-cell', 'sf-center', 'sf-point'],
              append: [
                mono.create('div', {
                  class: ['sf-place'],
                  append: [
                    strings.pointA,
                    ' ',
                    mono.create('div', {
                      style: {
                        display: 'inline-block',
                        verticalAlign: 'middle'
                      },
                      append: inlineArrow
                    }),
                    ' ',
                    strings.pointB,
                    ' ',
                    strings.calMonth
                  ]
                })
              ]
            }),
            width: {
              strings: [
                strings.pointA + ' ' + strings.pointB + ' ' + strings.calMonth
              ],
              fontSize: [26, 22, 18],
              plus: plusWidth
            }
          };
        } else {
          blocks.pointABlock = {
            node: mono.create('div', {
              class: ['sf-cell', 'sf-right', 'sf-point'],
              append: [
                mono.create('div', {
                  class: ['sf-place'],
                  text: strings.pointA
                })
              ]
            }),
            width: {
              strings: [
                strings.pointA
              ],
              fontSize: [26, 22, 18]
            }
          };

          if (isOneWay) {
            blocks.arrowBlock = {
              node: mono.create('div', {
                class: ['sf-cell', 'sf-center'],
                append: [
                  main.bar.getOneWayLine()
                ]
              }),
              width: 140
            };
          } else {
            blocks.arrowBlock = {
              node: mono.create('div', {
                class: ['sf-cell', 'sf-center'],
                append: [
                  main.bar.getTwoWayLines()
                ]
              }),
              width: 75
            };
          }

          blocks.pointBBlock = {
            node: mono.create('div', {
              class: ['sf-cell', 'sf-point'],
              append: [
                mono.create('div', {
                  class: ['sf-place'],
                  text: strings.pointB
                })
              ]
            }),
            width: {
              strings: [
                strings.pointB
              ],
              fontSize: [26, 22, 18]
            }
          };
        }

        blocks.priceBlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-price', 'sf-center', 'sf-nowrap'],
            append: main.getPriceNode(priceObj)
          }),
          width: {
            strings: [
              strings.price
            ],
            fontSize: 26,
            fontStyle: {
              fontWeight: 'bold'
            },
            default: 120
          },
          rightFixed: 1
        };

        var viewParams = {
          origin_iata: pageInfo.origin,
          destination_iata: pageInfo.destination,
          adults: 1,
          children: 0,
          infants: 0,
          trip_class: 0,
          depart_date: pageInfo.dateStart,
          return_date: pageInfo.dateEnd,
          marker: 89756,
          with_request: true
        };

        blocks.viewBlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-center'],
            append: [
              mono.create('a', {
                class: 'sf-view-btn',
                href: 'http://hydra.aviasales.ru/searches/new' + '?' + mono.param(viewParams),
                target: 'blank',
                text: strings.view,
                on: ['click', function() {
                  mono.sendMessage({
                    action: 'trackEvent',
                    category: 'cheapflight',
                    event: 'click',
                    label: hostname,
                    params: {tid: 'UA-70432435-1', cd: 'flightclick', noRewrite: true}
                  });

                  mono.sendMessage({
                    action: 'trackScreen',
                    screen: 'flightclick',
                    params: {tid: 'UA-70432435-1'}
                  });
                }]
              })
            ]
          }),
          width: 130,
          rightFixed: 1
        };

        blocks.rightResizeBlock = {
          node: mono.create('div', {
            class: ['sf-cell']
          }),
          width: 0
        };

        var leftFixedBlocks = [];
        var rightFixedBlocks = [];

        var rndId = 's' + Math.random().toString(36).substring(7);
        var bar = details.barEl = mono.create('div', {
          id: rndId,
          style: {
            top: '-1px !important',
            display: 'table !important',
            opacity: '1 !important',
            zIndex: 99999999
          },
          append: (function() {
            var blockList = [];
            for (var key in blocks) {
              var block = blocks[key];
              if (block.leftFixed) {
                leftFixedBlocks.push(key);
              }
              if (block.rightFixed) {
                rightFixedBlocks.push(key);
              }
              blockList.push(block.node);
            }
            return blockList;
          })(),
          on: ['click', function(e) {
            e.stopPropagation();
          }]
        });

        var currentFontSizeObj = {};
        if (isCalendar) {
          details.onBlocksResize = function (width, leftBlocksSize, rightBlockSize) {
            var type = 'calendarCanterBlock';
            var blockWidth = parseInt(width - leftBlocksSize - rightBlockSize);

            var needResize = false;
            (function() {
              var currentFontSize = currentFontSizeObj[type];
              if (currentFontSize) {
                if (blockWidth >= currentFontSize.minWidth && blockWidth < currentFontSize.maxWidth) {
                  return;
                }
              }

              needResize = true;

              var found = blocks[type].widthList.some(function (item) {
                if (blockWidth >= item.minWidth && blockWidth < item.maxWidth) {
                  currentFontSizeObj[type] = item;
                  return true;
                }
              });

              if (!found) {
                currentFontSizeObj[type] = blocks[type].widthList.slice(-1)[0];
              }
            })();

            if (needResize) {
              var fontSize = currentFontSizeObj[type].fontSize;
              blocks[type].node.style.fontSize = fontSize + 'px';
            }

            blocks[type].node.style.width = blockWidth + 'px';
          };
        } else {
          details.onBlocksResize = function (width, leftBlocksSize, rightBlockSize) {
            var arrowBlockWidth = width / 2 - blocks.arrowBlock.width / 2;

            var blockWidthObj = {
              pointABlock: parseInt(arrowBlockWidth - leftBlocksSize),
              pointBBlock: parseInt(arrowBlockWidth - rightBlockSize)
            };

            var needResize = false;
            ['pointABlock', 'pointBBlock'].forEach(function (type) {
              var blockWidth = blockWidthObj[type];

              var currentFontSize = currentFontSizeObj[type];
              if (currentFontSize) {
                if (blockWidth >= currentFontSize.minWidth && blockWidth < currentFontSize.maxWidth) {
                  return;
                }
              }

              needResize = true;

              var found = blocks[type].widthList.some(function (item) {
                if (blockWidth >= item.minWidth && blockWidth < item.maxWidth) {
                  currentFontSizeObj[type] = item;
                  return true;
                }
              });

              if (!found) {
                currentFontSizeObj[type] = blocks[type].widthList.slice(-1)[0];
              }
            });

            if (needResize) {
              var fontSize = Math.min(currentFontSizeObj.pointABlock.fontSize, currentFontSizeObj.pointBBlock.fontSize);
              blocks.pointABlock.node.style.fontSize = fontSize + 'px';
              blocks.pointBBlock.node.style.fontSize = fontSize + 'px';
            }

            blocks.pointABlock.node.style.width = blockWidthObj.pointABlock + 'px';
            blocks.pointBBlock.node.style.width = blockWidthObj.pointBBlock + 'px';
          };
        }

        var barHeight = 46;
        return main.bar.calcBlockSize(blocks, function() {
          var style = details.styleEl = main.bar.getStyle({
            rndId: rndId,
            barHeight: barHeight
          });

          var leftBlocksSize = 0;
          leftFixedBlocks.forEach(function(key) {
            leftBlocksSize += blocks[key].width;
          });

          var rightBlockSize = 0;
          rightFixedBlocks.forEach(function(key) {
            rightBlockSize += blocks[key].width;
          });

          var lastBarWidth = 0;
          var currentWidthFix = 0;
          var barMaxWidth = 1200;

          var updateBarWidth = function() {
            var width = document.documentElement.clientWidth;

            var sizeFix = width - barMaxWidth;
            if (sizeFix > 0) {
              width = barMaxWidth;

              var fixWidth = Math.floor(sizeFix / 2);
              if (fixWidth !== currentWidthFix) {
                currentWidthFix = fixWidth;
                blocks.leftResizeBlock.node.style.width = fixWidth + 'px';
                blocks.rightResizeBlock.node.style.width = fixWidth + 'px';
              }
            } else
            if (currentWidthFix !== 0) {
              currentWidthFix = 0;
              blocks.leftResizeBlock.node.style.width = 0;
              blocks.rightResizeBlock.node.style.width = 0;
            }

            if (lastBarWidth === width) {
              return;
            }
            lastBarWidth = width;

            return details.onBlocksResize(width, leftBlocksSize, rightBlockSize);
          };

          details.onResize = updateBarWidth;
          window.addEventListener('resize', details.onResize);

          if (oldBar) {
            oldBar.replace(details);
            updateBarWidth();

            mono.sendMessage({
              action: 'trackEvent',
              category: 'cheapflight',
              event: 'update',
              label: hostname,
              params: {tid: 'UA-70432435-1', noRewrite: true}
            });
          } else {
            var ctr = mono.create(document.createDocumentFragment(), {
              append: [bar, style]
            });

            document.body.appendChild(ctr);

            setTimeout(function() {
              updateBarWidth();
              main.bar.marginPage(details, barHeight);
            }, 0);

            mono.sendMessage({
              action: 'trackEvent',
              category: 'cheapflight',
              event: 'show',
              label: hostname,
              params: {tid: 'UA-70432435-1', cd: 'flightshow', noRewrite: true}
            });

            mono.sendMessage({
              action: 'trackScreen',
              screen: 'flightshow',
              params: {tid: 'UA-70432435-1'}
            });
          }

          if (isCalendar) {
            mono.sendMessage({
              action: 'trackEvent',
              category: 'cheapflight',
              event: 'calendarPrice',
              label: hostname,
              params: {tid: 'UA-70432435-1', noRewrite: true}
            });
          }
        });
      },
      hotelBarCreate: function(details, oldBar) {
        var prices = details.prices;
        var pageInfo = details.pageInfo;

        var mainItemIndex = 0;

        var lang = main.bar.getLang();

        var mainItem = main.bar.prepareItem(pageInfo, prices.data[mainItemIndex]);

        var priceObj = main.getPrice(mainItem.currency, mainItem.value);

        var strings = {
          foundHotel: lang.foundHotel + String.fromCharCode(160),
          name: mainItem.name,
          checkIn: lang.checkIn + String.fromCharCode(160),
          checkOut: lang.checkOut + String.fromCharCode(160),
          dateIn: main.getDate(mainItem.dateIn),
          dateOut: main.getDate(mainItem.dateOut),
          price: priceObj.string
        };

        var blocks = {};
        blocks.closeBlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-center']
          }),
          closeBtn: mono.create('a', {
            class: 'sf-close-btn',
            href: '#close',
            title: lang.close,
            append: [
              main.bar.getCloseBtn()
            ],
            on: ['click', function(e) {
              e.preventDefault();

              details.close(1);

              mono.sendMessage({
                action: 'trackEvent',
                category: 'hotel',
                event: 'close',
                label: hostname,
                params: {tid: 'UA-70432435-1', noRewrite: true}
              });
            }]
          }),
          width: 36,
          leftFixed: 1
        };
        blocks.closeBlock.node.appendChild(blocks.closeBlock.closeBtn);

        blocks.leftResizeBlock = {
          node: mono.create('div', {
            class: ['sf-cell']
          }),
          width: 0
        };

        blocks.dateFoundBlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-label', 'sf-right'],
            text: strings.foundHotel
          }),
          width: {
            strings: [
              strings.foundHotel
            ],
            fontSize: 14,
            default: 120
          },
          leftFixed: 1
        };

        blocks.pointABlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-point'],
            append: [
              mono.create('div', {
                class: ['sf-place'],
                text: strings.name
              })
            ]
          }),
          width: {
            strings: [
              strings.name
            ],
            fontSize: [26, 22, 18]
          }
        };

        blocks.dateLabesBlock = {
          node: mono.create('div', {
            class: ['sf-cell'],
            append: [
              mono.create('div', {
                class: ['sf-right'],
                text: strings.checkIn
              }),
              mono.create('div', {
                class: ['sf-right'],
                text: strings.checkOut
              })
            ]
          }),
          width: {
            strings: [
              strings.checkIn,
              strings.checkOut
            ],
            fontSize: 14,
            default: 80
          },
          rightFixed: 1
        };

        blocks.dateBlock = {
          node: mono.create('div', {
            class: ['sf-cell'],
            append: [
              mono.create('div', {
                class: ['sf-nowrap'],
                text: strings.dateIn
              }),
              mono.create('div', {
                class: ['sf-nowrap'],
                text: strings.dateOut
              })
            ]
          }),
          width: {
            strings: [
              strings.dateIn,
              strings.dateOut
            ],
            fontSize: 14,
            default: 100
          },
          rightFixed: 1
        };

        blocks.priceBlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-price', 'sf-center', 'sf-nowrap'],
            append: main.getPriceNode(priceObj)
          }),
          width: {
            strings: [
              strings.price
            ],
            fontSize: 26,
            fontStyle: {
              fontWeight: 'bold'
            },
            plus: 30,
            default: 120
          },
          rightFixed: 1
        };

        blocks.viewBlock = {
          node: mono.create('div', {
            class: ['sf-cell', 'sf-center'],
            append: [
              mono.create('a', {
                class: 'sf-view-btn',
                href: mainItem.link,
                target: 'blank',
                text: lang.view,
                on: ['click', function() {
                  mono.sendMessage({
                    action: 'trackEvent',
                    category: 'hotel',
                    event: 'click',
                    label: hostname,
                    params: {tid: 'UA-70432435-1', cd: 'hotelclick', noRewrite: true}
                  });

                  mono.sendMessage({
                    action: 'trackScreen',
                    screen: 'hotelclick',
                    params: {tid: 'UA-70432435-1'}
                  });
                }]
              })
            ]
          }),
          width: 130,
          rightFixed: 1
        };

        blocks.rightResizeBlock = {
          node: mono.create('div', {
            class: ['sf-cell']
          }),
          width: 0
        };

        var leftFixedBlocks = [];
        var rightFixedBlocks = [];

        var rndId = 's' + Math.random().toString(36).substring(7);
        var bar = details.barEl = mono.create('div', {
          id: rndId,
          style: {
            top: '-1px !important',
            display: 'table !important',
            opacity: '1 !important',
            zIndex: 99999999
          },
          append: (function() {
            var blockList = [];
            for (var key in blocks) {
              var block = blocks[key];
              if (block.leftFixed) {
                leftFixedBlocks.push(key);
              }
              if (block.rightFixed) {
                rightFixedBlocks.push(key);
              }
              blockList.push(block.node);
            }
            return blockList;
          })(),
          on: ['click', function(e) {
            e.stopPropagation();
          }]
        });

        var currentFontSizeObj = {};
        details.onBlocksResize = function (width, leftBlocksSize, rightBlockSize) {
          var type = 'pointABlock';
          var blockWidth = parseInt(width - leftBlocksSize - rightBlockSize);

          var needResize = false;
          (function() {
            var currentFontSize = currentFontSizeObj[type];
            if (currentFontSize) {
              if (blockWidth >= currentFontSize.minWidth && blockWidth < currentFontSize.maxWidth) {
                return;
              }
            }

            needResize = true;

            var found = blocks[type].widthList.some(function (item) {
              if (blockWidth >= item.minWidth && blockWidth < item.maxWidth) {
                currentFontSizeObj[type] = item;
                return true;
              }
            });

            if (!found) {
              currentFontSizeObj[type] = blocks[type].widthList.slice(-1)[0];
            }
          })();

          if (needResize) {
            var fontSize = currentFontSizeObj[type].fontSize;
            blocks[type].node.style.fontSize = fontSize + 'px';
          }

          blocks[type].node.style.width = blockWidth + 'px';
        };

        var barHeight = 46;
        main.bar.calcBlockSize(blocks, function() {
          var style = details.styleEl = main.bar.getStyle({
            rndId: rndId,
            barHeight: barHeight
          });

          var leftBlocksSize = 0;
          leftFixedBlocks.forEach(function(key) {
            leftBlocksSize += blocks[key].width;
          });

          var rightBlockSize = 0;
          rightFixedBlocks.forEach(function(key) {
            rightBlockSize += blocks[key].width;
          });

          var lastBarWidth = 0;
          var currentWidthFix = 0;
          var barMaxWidth = 1200;

          var updateBarWidth = function() {
            var width = document.documentElement.clientWidth;

            var sizeFix = width - barMaxWidth;
            if (sizeFix > 0) {
              width = barMaxWidth;

              var fixWidth = Math.floor(sizeFix / 2);
              if (fixWidth !== currentWidthFix) {
                currentWidthFix = fixWidth;
                blocks.leftResizeBlock.node.style.width = fixWidth + 'px';
                blocks.rightResizeBlock.node.style.width = fixWidth + 'px';
              }
            } else
            if (currentWidthFix !== 0) {
              currentWidthFix = 0;
              blocks.leftResizeBlock.node.style.width = 0;
              blocks.rightResizeBlock.node.style.width = 0;
            }

            if (lastBarWidth === width) {
              return;
            }
            lastBarWidth = width;

            return details.onBlocksResize(width, leftBlocksSize, rightBlockSize);
          };

          details.onResize = updateBarWidth;
          window.addEventListener('resize', details.onResize);

          if (oldBar) {
            oldBar.replace(details);
            updateBarWidth();

            mono.sendMessage({
              action: 'trackEvent',
              category: 'hotel',
              event: 'update',
              label: hostname,
              params: {tid: 'UA-70432435-1', noRewrite: true}
            });
          } else {
            var ctr = mono.create(document.createDocumentFragment(), {
              append: [bar, style]
            });

            document.body.appendChild(ctr);

            setTimeout(function() {
              updateBarWidth();
              main.bar.marginPage(details, barHeight);
            }, 0);

            mono.sendMessage({
              action: 'trackEvent',
              category: 'hotel',
              event: 'show',
              label: hostname,
              params: {tid: 'UA-70432435-1', cd: 'hotelshow', noRewrite: true}
            });

            mono.sendMessage({
              action: 'trackScreen',
              screen: 'hotelshow',
              params: {tid: 'UA-70432435-1'}
            });
          }
        });
      },
      create: function(details) {
        var oldBar = main.bar.current;
        if (oldBar && oldBar.isClosed) {
          oldBar = null;
        }

        main.bar.current = details;

        details.isClosed = false;
        details.close = function(byUser) {
          if (details.isClosed) {
            return;
          }
          details.isClosed = true;

          main.bar.onClose(details, byUser);
        };

        details.replace = function(newDetails) {
          main.bar.onReplace(details, newDetails);
        };

        if (details.type === 'hotel') {
          main.bar.hotelBarCreate(details, oldBar);
        } else {
          main.bar.aviaBarCreate(details, oldBar);
        }
      }
    }
  });

  mono.extend(main, {
    cultureInfo: {
      ru: {
        weekdaysShort : 'Вс_Пн_Вт_Ср_Чт_Пт_Сб'.split('_'),
        months : 'января_февраля_марта_апреля_мая_июня_июля_августа_сентября_октября_ноября_декабря'.split('_'),
        monthsCal : 'январе_феврале_марте_апреле_мае_июне_июле_августе_сентябре_октябре_ноябре_декабре'.split('_'),
        dateFormat: 'D MMMM, ddd',
        timeFormat: 'HH:mm'
      },
      en: {
        weekdaysShort : 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        months : 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
        dateFormat: 'D MMMM, ddd',
        timeFormat: 'h:mm A'
      },
      de: {
        weekdaysShort : 'So._Mo._Di._Mi._Do._Fr._Sa.'.split('_'),
        months : 'Jänner_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember'.split('_'),
        dateFormat: 'ddd, D. MMMM',
        timeFormat: 'HH:mm'
      }
    },
    ccyFormats: {
      USD: {
        symbol: "$",
        standard: "¤#,##0.00",
        details: {
          symbolRight: false,
          symbolSep: '',
          threeSep: ',',
          toFixed: 2
        }
      },
      EUR: {
        symbol: "€",
        standard: "#,##0.00 ¤",
        details: {
          symbolRight: true,
          symbolSep: ' ',
          threeSep: ',',
          toFixed: 2
        }
      },
      RUB: {
        symbol: "₽",
        standard: "#,##0.00 ¤",
        details: {
          symbolRight: true,
          symbolSep: ' ',
          threeSep: ',',
          toFixed: 2
        },
        getNode: function() {
          var link = document.querySelector('link.sf-price-font');
          if (!link) {
            link = mono.create('link', {
              class: 'sf-price-font',
              href: 'https://fonts.googleapis.com/css?family=PT+Sans:bold',
              rel: 'stylesheet',
              type: 'text/css'
            });
            document.head.appendChild(link);
          }

          return mono.create('span', {
            text: this.symbol,
            style: {
              fontFamily: '"PT Sans", Arial, serif'
            }
          });
        }
      },
      BYR: {
        symbol: "р.",
        standard: "#,##0.00 ¤",
        details: {
          symbolRight: true,
          symbolSep: ' ',
          threeSep: ',',
          toFixed: 2
        }
      },
      KZT: {
        symbol: "T",//"₸",
        standard: "#,##0.00 ¤",
        details: {
          symbolRight: true,
          symbolSep: ' ',
          threeSep: ',',
          toFixed: 2
        }
      },
      UAH: {
        symbol: "₴",
        standard: "#,##0.00 ¤",
        details: {
          symbolRight: true,
          symbolSep: ' ',
          threeSep: ',',
          toFixed: 2
        }
      }
    },
    convertCcy: function(price, toCcy) {
      toCcy = toCcy.toLowerCase();
      var ccyList = main.cache.ccyList;
      var value = ccyList[toCcy];
      return price / value;
    },
    getCityName: function(cityCode) {
      var lang = language.lang;
      var city = main.cache.cityMap[cityCode];
      if (!city) {
        var airport = main.cache.airportMap[cityCode];
        if (airport) {
          cityCode = airport.city_code;
          city = main.cache.cityMap[cityCode];
        }
      }
      if (!city) {
        return null;
      }

      var localName = city.name_translations && city.name_translations[lang];
      return localName || city.name;
    },
    getDate: function(value) {
      var time = new Date(value);
      var culture = main.cultureInfo[language.lang] || main.cultureInfo.en;
      var template = culture.dateFormat;
      template = template.replace(/([a-zA-Z]+)/g, function(text, value) {
        switch (value) {
          case 'D':
            return time.getDate();
          case 'MMMM':
            return culture.months[time.getMonth()];
          case 'ddd':
            return culture.weekdaysShort[time.getDay()];
        }
      });
      return template;
    },
    getCalMonth: function(value) {
      var time = new Date(value);
      var culture = main.cultureInfo[language.lang] || main.cultureInfo.en;
      return (culture.monthsCal || culture.months)[time.getMonth()];
    },
    getPrice: function(ccy, value) {
      var cultureCcy = main.ccyFormats[ccy];

      if (!cultureCcy) {
        cultureCcy = {
          symbol: ccy,
          details: {
            symbolRight: true,
            symbolSep: ' ',
            threeSep: ',',
            toFixed: 2
          }
        };
      }

      var details = cultureCcy.details;

      value = value.toFixed(details.toFixed);
      var splitValue = value.toString().split('.');

      var b = splitValue[1];
      var fixedValue = '';
      for (var i = 0; i < details.toFixed; i++) {
        fixedValue += '0';
      }
      if (b === fixedValue) {
        b = '';
      }

      var a = splitValue[0];

      a = a.split('').reverse().join('');
      a = a.replace(/(\d{3})/g, '$1,');
      a = a.split('').reverse().join('');
      if (a[0] === ',') {
        a = a.substr(1);
      }
      a = a.split(',');
      a = a.join(details.threeSep);

      splitValue = [a];
      if (b) {
        splitValue.push(b);
      }
      var strValue = splitValue.join('.');

      var arr = [strValue];
      if (details.symbolRight) {
        if (details.symbolSep) {
          arr.push(details.symbolSep);
        }
        arr.push(cultureCcy.symbol);
      } else {
        if (details.symbolSep) {
          arr.unshift(details.symbolSep);
        }
        arr.unshift(cultureCcy.symbol);
      }
      var strValueSymbol = arr.join('');

      return {
        string: strValueSymbol,
        value: strValue,
        cultureCcy: cultureCcy
      };
    },
    getPriceNode: function(priceObj) {
      var cultureCcy = priceObj.cultureCcy;
      var details = cultureCcy.details;

      var getSymbol = function() {
        if (cultureCcy.getNode) {
          return cultureCcy.getNode();
        }

        return cultureCcy.symbol;
      };

      var arr = [priceObj.value];
      if (details.symbolRight) {
        if (details.symbolSep) {
          arr.push(details.symbolSep);
        }
        arr.push(getSymbol());
      } else {
        if (details.symbolSep) {
          arr.unshift(details.symbolSep);
        }
        arr.unshift(getSymbol());
      }

      return mono.create(document.createDocumentFragment(), {
        append: arr
      });
    },
    getBarItemIndex: function(priceList) {
      var minDate = null;
      var minItem = null;

      priceList.forEach(function(item) {
        var m = item.depart_date.match(/(\d{4}.\d{2}.\d{2})/);
        m = m && m[1];
        if (!m) {
          return;
        }
        var date = (new Date(m)).getTime();

        if (minDate === null || minDate > date) {
          minDate = date;
          minItem = null;
        }

        if (date !== minDate) {
          return;
        }

        if (minItem === null || item.value < minItem.value) {
          minItem = item;
        }
      });

      var index = priceList.indexOf(minItem);

      log('Bar item', index, minItem);
      log('Result prices', priceList);

      return index;
    }
  });

  mono.extend(main, {
    currentProfile: null,
    profileList: {},
    observer: null,
    infoList: {},
    closeCurrentBar: function() {
      var bar = main.bar.current;
      main.bar.isAborted = true;
      if (!bar || bar.isClosed) {
        return;
      }
      bar.close();
    },
    stopObserver: function() {
      main.observer && main.observer.stop();
    },
    clearInfoObj: function(pageInfo) {
      for (var url in main.infoList) {
        if (main.infoList[url] !== pageInfo) {
          delete main.infoList[url];
        }
      }
    },
    getInfoObj: function() {
      var url = document.URL;
      var info = main.infoList[url];
      if (!info) {
        info = main.infoList[url] = {};
      }
      return info;
    },
    initProfile: function(details) {
      main.currentProfile = details;
      var isAllowUrl = function() {
        return !details.urlTest ? true : details.urlTest(document.URL)
      };

      var checkBaseInfo = function() {
        var info = main.getInfoObj();
        return details.baseInfo.every(function(item) {
          return !!info[item];
        });
      };

      var cbList = [];

      var runCbList = function() {
        var cb;
        while(cb = cbList.shift()) {
          cb();
        }
      };

      var _isLoading = false;
      var getInfo = function(cb) {
        if (cbList.indexOf(cb) === -1) {
          cbList.push(cb);
        }

        if (checkBaseInfo()) {
          return runCbList();
        }

        if (_isLoading) {
          return;
        }
        _isLoading = true;

        var n, count;
        count = n = 20;

        (function wait() {
          var cb = function() {
            if (n > 0 && !checkBaseInfo()) {
              return wait();
            }
            _isLoading = false;

            runCbList();
          };

          var abort = function() {
            log('Waiting is aborted!');
            n = 0;
            cb();
          };

          log('request getBaseInfo');
          setTimeout(function() {
            n--;
            details.getBaseInfo(cb, abort);
          }, n === count ? 1 : 3000);
        })();
      };

      var onGetInfo = mono.debounce(function() {
        main.onGetData();
      }, 500);

      if (!isAllowUrl()) {
        log('1 is not allow url', document.URL);
        main.closeCurrentBar();
        return;
      }

      getInfo(function() {
        details.watcher(function () {
          if (!isAllowUrl()) {
            main.stopObserver();
            main.closeCurrentBar();
            log('2 is not allow url', document.URL);
            return;
          }
          getInfo(onGetInfo);
        });
      });
    },
    watchPageTemplates: {
      price: function(details, summary) {
        var hasChanges = false;
        var info = details.info;
        for (var n = 0, node; node = summary.added[n]; n++) {
          var price = main.preparePrice(node);
          if (!info.price || price < info.price) {
            info.price = price;
            hasChanges = true;
          }
        }

        return hasChanges;
      },
      oneDayPrice: function(details, summary) {
        var hasChanges = false;
        var info = details.info;

        if (!info.dayCount) {
          return false;
        }

        for (var n = 0, node; node = summary.added[n]; n++) {
          var price = main.preparePrice(node);
          if (!info.oneDayPrice || price < info.oneDayPrice) {
            info.oneDayPrice = price;
            info.price = info.dayCount * price;
            hasChanges = true;
          }
        }

        return hasChanges;
      },
      currency: function(details, summary) {
        var hasChanges = false;
        var info = details.info;
        for (var n = 0, node; node = summary.added[n]; n++) {
          var text = node.textContent;
          text = text && text.replace(/[\s\t]/g, '');
          var ccy = main.validateCcy(text);
          if (ccy && info.currency !== ccy) {
            if (details.map && details.map[ccy]) {
              ccy = details.map[ccy];
            }
            info.currency = ccy;
            hasChanges = true;
          }
        }

        return hasChanges;
      },
      minPriceOut: function(details, summary) {
        var hasChanges = false;
        var info = details.info;
        for (var n = 0, node; node = summary.added[n]; n++) {
          var price = main.preparePrice(node);
          if (!price) {
            continue;
          }
          if (!info.minOutPrice || price < info.minOutPrice) {
            info.minOutPrice = price;
            hasChanges = true;
          }
          if (hasChanges) {
            info.price = info.minOutPrice;
            if (info.minInPrice) {
              info.price += info.minInPrice;
            }
          }
        }
        return hasChanges;
      },
      minPriceIn: function(details, summary) {
        var hasChanges = false;
        var info = details.info;
        for (var n = 0, node; node = summary.added[n]; n++) {
          var price = main.preparePrice(node);
          if (!price) {
            continue;
          }
          if (!info.minInPrice || price < info.minInPrice) {
            info.minInPrice = price;
            hasChanges = true;
          }
          if (hasChanges) {
            info.price = info.minInPrice;
            if (info.minOutPrice) {
              info.price += info.minOutPrice;
            }
          }
        }
        return hasChanges;
      }
    },
    watchPage: function(details, cb) {
      var templates = this.watchPageTemplates;

      if (this.observer) {
        this.observer.stop();
      }

      this.observer = components.mutationWatcher.run({
        callback: function(summaryList) {
          var info = main.getInfoObj();
          var hasChanges = false;
          for (var i = 0, summary; summary = summaryList[i]; i++) {
            var _details = details.queriesMap[i];
            if (typeof _details === 'function') {
              if (_details(summary)) {
                hasChanges = true;
              }
            } else {
              _details.info = info;
              if (templates[_details.name](_details, summary)) {
                hasChanges = true;
              }
            }
          }
          hasChanges && cb();
        },
        queries: details.queries
      });
    },
    getParamsFromPage: function(varList, cb) {
      var isObjMode = false;
      if (typeof varList === 'object' && !Array.isArray(varList)) {
        isObjMode = Object.keys(varList);
        varList = isObjMode.map(function(key) {
          return varList[key];
        });
      }
      components.bridge({
        args: [varList],
        func: function(varList, cb) {
          var rList = [];
          varList.forEach(function(item) {
            var vars = item.split('.');
            var obj = window[vars.shift()];
            obj && vars.some(function(variable) {
              if (typeof obj[variable] !== 'undefined') {
                obj = obj[variable];
              } else {
                obj = null;
                return true;
              }
            });
            rList.push(obj);
          });
          cb(rList);
        },
        cb: function(_data) {
          var data = _data;
          if (isObjMode) {
            data = {};
            _data.forEach(function(item, index) {
              data[isObjMode[index]] = item;
            });
          }
          return cb(data);
        }
      });
    },
    validateIataCode: function(value) {
      if (/^(?:[A-Z]{3}|-)$/.test(value)) {
        return value.toUpperCase();
      }
      error('City validation error!', value);
      return null;
    },
    validateDate: function(value) {
      // yyyy-mm-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // yyyy-mm
      if (/^\d{4}-\d{2}$/.test(value)) {
        return value;
      }
      error('Date validation error!', value);
      return null;
    },
    validateCcy: function(value) {
      if (/^[A-Z]{3}$/.test(value)) {
        return value;
      }
      error('Currency validation error!', value);
      return null;
    },
    validateNumber: function(value) {
      var int = parseInt(value);
      if (isNaN(int)) {
        return null;
      }
      return int;
    },
    validateAdults: function(value) {
      var int = this.validateNumber(value);
      if (!int || int < 1) {
        return null;
      }
      return int;
    },
    preparePrice: function(node) {
      var value = node.textContent;
      if (!value) {
        log('Price is empty!', value);
        return null;
      }

      value = value.replace(',', '.');
      value = value.replace(/[^\d\.]/g, '');
      value = value.replace(/\.(\d{3,})/, "$1");
      var m = value.match(/(\d+)(\.\d+)?/);
      if (!m) {
        log('Price is empty 2!', value);
        return null;
      }
      value = m[1];
      if (m[2]) {
        value += m[2];
      }
      value = parseFloat(value);
      if (isNaN(value)) {
        log('Price is NaN!', value);
        return null;
      }
      return value;
    },
    reFormatDate: function(value, re, template) {
      if (re.test(value)) {
        if (typeof value === 'number') {
          value = value.toString();
        }
        var m = value.match(re);
        if (!m) {
          return null;
        }
        return template.replace(/\$(\d)/g, function(text, index) {
          return m[index];
        });
      }
      return null;
    }
  });

  main.profileList['*://*.skyscanner.*/*'] = function() {
    var getSearchParams = function(cb) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'Skyscanner.ComponentContext.originIataCode',
        'Skyscanner.ComponentContext.destinationIataCode',
        'Skyscanner.ComponentContext.outboundDate',
        'Skyscanner.ComponentContext.inboundDate',
        'Skyscanner.ComponentContext.currency'
      ], function(varList) {
        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);
        info.dateStart = main.validateDate(varList[2]);
        varList[3] && (info.dateEnd = main.validateDate(varList[3]));
        info.currency = main.validateCcy(varList[4]);

        cb();
      });
    };

    var details = {
      urlTest: function(url) {
        return /\/transport\/flights\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb) {
        getSearchParams(cb);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.card.result .mainquote .mainquote-price', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };

    main.initProfile(details);
  };

  main.profileList['*://*.momondo.*/*'] = function() {
    var getInfoFromUrl = function(cb) {
      var url = document.URL;

      var hash = url.match(/#(.+)/) || url.match(/\?(.+)/);
      hash = hash && hash[1];
      if (!hash) {
        return cb();
      }

      var info = main.getInfoObj();
      var params = mono.parseUrl(hash, {params: 1});

      info.origin = main.validateIataCode(params['SO0']);
      info.destination = main.validateIataCode(params['SD0']);

      var dateStart = main.reFormatDate(params['SDP0'], /(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1");
      info.dateStart = main.validateDate(dateStart);

      var dateEnd = main.reFormatDate(params['SDP1'], /(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1");
      dateEnd && (info.dateEnd = main.validateDate(dateEnd));

      cb();
    };

    var details = {
      urlTest: function(url) {
        return /\/flightsearch\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart'],
      getBaseInfo: function(cb) {
        getInfoFromUrl(cb);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.ticketinfo .price .value', is: 'added'},
            {css: '.ticketinfo .price .unit', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'},
            {name: 'currency'}
          ]
        }, function() {
          onChange();
        });
      },
      onShow: function(barHeight) {
        var header = document.querySelector('#mui-header');
        if (!header) {
          return;
        }
        header.style.marginTop = barHeight + 'px';
      },
      onHide: function() {
        var header = document.querySelector('#mui-header');
        if (!header) {
          return;
        }
        header.style.marginTop = 0;
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.ozon.travel/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'a.data.SearchParams.CodeFrom1',
        'a.data.SearchParams.CodeTo1',
        'a.data.SearchParams.Date1',
        'a.data.SearchParams.Date2',
        'a.data.SearchParams.Date3',
        'a.data.SearchParams.CodeFrom2',
        'a.data.SearchParams.CodeTo2'
      ], function(varList) {
        if (varList[4]) {
          error('More two params.');
          return abort();
        }

        if (varList[5] && (varList[0] !== varList[6] || varList[1] !== varList[5])) {
          error('More one way!', varList);
          return abort();
        }

        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);
        info.dateStart = main.validateDate(varList[2]);
        varList[3] && (info.dateEnd = main.validateDate(varList[3]));

        cb();
      });
    };

    var details = {
      urlTest: function(url) {
        return /\/flight\/search\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.tariffs .price-data big', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          var info = main.getInfoObj();
          var ccy = document.querySelector('.currency-form .currency-filter input[name="Currency"]');
          ccy = ccy && ccy.value;
          if (ccy) {
            ccy = ccy.replace(/[\s\t]/g, '');
            ccy = main.validateCcy(ccy);
            if (ccy && info.currency !== ccy){
              info.currency = ccy;
            }
          }

          onChange();
        });
      }
    };

    main.initProfile(details);
  };

  main.profileList['*://*.onetwotrip.com/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'xcnt_transport_from',
        'xcnt_transport_to',
        'xcnt_transport_depart_date',
        'xcnt_transport_return_date',
        'tw.currency',
        'xcnt_transport_type'
      ], function(varList) {
        if (varList[5] !== 'air') {
          return abort();
        }

        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);

        var dateStart = main.reFormatDate(varList[2], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        info.dateStart = main.validateDate(dateStart);

        var dateEnd = main.reFormatDate(varList[3], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        dateEnd && (info.dateEnd = main.validateDate(dateEnd));

        info.currency = main.validateCcy(varList[4]);

        cb();
      });
    };

    var details = {
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.price_button .money-formatted', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };

    main.initProfile(details);
  };

  main.profileList['*://*.kayak.*/*'] = function() {
    var getSearchParams = function(cb) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'R9.globals.analytics.pixelContext.originCode',
        'R9.globals.analytics.pixelContext.destinationCode',
        'R9.globals.analytics.pixelContext.departureDate',
        'R9.globals.analytics.pixelContext.returnDate',
        'R9.globals.analytics.pixelContext.site_currency'
      ], function(varList) {
        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);

        var dateStart = main.reFormatDate(varList[2], /(\d{4})-(\d{2})-(\d{2})/, "$1-$2-$3");
        info.dateStart = main.validateDate(dateStart);

        var dateEnd = main.reFormatDate(varList[3], /(\d{4})-(\d{2})-(\d{2})/, "$1-$2-$3");
        dateEnd && (info.dateEnd = main.validateDate(dateEnd));

        info.currency = main.validateCcy(varList[4]);

        cb();
      });
    };

    var details = {
      urlTest: function(url) {
        return /\/flights\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart'],
      getBaseInfo: function(cb) {
        getSearchParams(cb);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.flightresult .results_price', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.travelocity.com/*'] = main.profileList['*://*.orbitz.com/*'] = main.profileList['*://*.expedia.com/*'] = function() {
    var getAvia = function() {
      return {
        urlTest: function(url) {
          return /\/Flights-Search/.test(url);
        },
        baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
        getBaseInfo: function(cb, abort) {
          var info = main.getInfoObj();
          main.getParamsFromPage([
            'IntentMediaProperties.flight_origin',
            'IntentMediaProperties.flight_destination',
            'IntentMediaProperties.travel_date_start',
            'IntentMediaProperties.travel_date_end',
            'IntentMediaProperties.site_currency',
            'IntentMediaProperties.product_category'
          ], function(varList) {
            if (varList[5] === null) {
              return cb();
            }

            if (varList[5] !== 'flights') {
              return abort();
            }

            info.origin = main.validateIataCode(varList[0]);
            info.destination = main.validateIataCode(varList[1]);

            var dateStart = main.reFormatDate(varList[2], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
            info.dateStart = main.validateDate(dateStart);

            var dateEnd = main.reFormatDate(varList[3], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
            dateEnd && (info.dateEnd = main.validateDate(dateEnd));

            info.currency = main.validateCcy(varList[4]);

            cb();
          });
        },
        watcher: function(onChange) {
          main.watchPage({
            queries: [
              {css: '#flightModuleList .offer-price .visuallyhidden', is: 'added'}
            ],
            queriesMap: [
              {name: 'price'}
            ]
          }, function() {
            onChange();
          });
        }
      };
    };

    var getHotel = function() {
      return {
        urlTest: function(url) {
          return /Hotel-Information/.test(url);
        },
        baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
        getBaseInfo: function(cb, abort) {
          main.getParamsFromPage({
            cityName: 'IntentMediaProperties.hotel_city_name',
            name: 'IntentMediaProperties.hotel_supplier',
            adults: 'IntentMediaProperties.adults',
            rooms: 'IntentMediaProperties.hotel_rooms',
            checkIn: 'IntentMediaProperties.travel_date_start',
            checkOut: 'IntentMediaProperties.travel_date_end',
            ccy: 'IntentMediaProperties.site_currency',
            pageId: 'IntentMediaProperties.page_id'
          }, function(dataObj) {
            if (dataObj.pageId === null) {
              return cb();
            }

            if (dataObj.pageId !== 'hotel.details' || dataObj.rooms > 1 || !dataObj.name) {
              return abort();
            }

            var info = main.getInfoObj();
            info.type = 'hotel';

            info.name = dataObj.name;
            info.query = [dataObj.name];
            if (dataObj.cityName) {
              info.query.unshift(dataObj.name + ' ' + dataObj.cityName);
            }

            info.adults = main.validateAdults(dataObj.adults);

            var dateStart = main.reFormatDate(dataObj.checkIn, /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
            info.dateIn = main.validateDate(dateStart);

            var dateEnd = main.reFormatDate(dataObj.checkOut, /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
            info.dateOut = main.validateDate(dateEnd);

            info.currency = main.validateCcy(dataObj.ccy);

            if (info.dateIn && info.dateOut) {
              var dateIn = new Date(info.dateIn);
              var dateOut = new Date(info.dateOut);
              info.dayCount = Math.round((dateOut.getTime() - dateIn.getTime()) / 24 / 60 / 60 / 1000);
            }

            cb();
          });
        },
        watcher: function(onChange) {
          main.watchPage({
            queries: [
              {css: '#rooms-and-rates .room-price-info-wrapper .room-price', is: 'added'}
            ],
            queriesMap: [
              {name: 'oneDayPrice'}
            ]
          }, function() {
            onChange();
          });
        }
      }
    };


    var details = null;

    if (/Hotel-Information/.test(document.URL)) {
      details = getHotel();
    } else {
      details = getAvia();
    }

    main.initProfile(details);
  };

  main.profileList['*://*.priceline.com/*'] = function() {
    var getSearchParams = function(cb) {
      var url = document.URL;
      var m = url.match(/\/search\/([^-\/]+)-([^-\/]+)-([^-\/]+)\/(?:([^-\/]+)-([^-\/]+)-([^-\/]+)\/)?\d/);
      if (!m) {
        return cb();
      }

      var info = main.getInfoObj();

      info.origin = main.validateIataCode(m[1].split(':')[0]);
      info.destination = main.validateIataCode(m[2].split(':')[0]);

      var dateStart = main.reFormatDate(m[3], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      info.dateStart = main.validateDate(dateStart);

      var dateEnd = main.reFormatDate(m[6], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      dateEnd && (info.dateEnd = main.validateDate(dateEnd));
      cb();
    };

    var details = {
      urlTest: function(url) {
        return /\/fly\/#\/search\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart'],
      getBaseInfo: function(cb) {
        getSearchParams(cb);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.fly-search-itinerary .pricing-info div.total', is: 'added'},
            {css: 'span[ng-bind="currencyCode"]', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'},
            {name: 'currency'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.aeroflot.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();

      var dataArr = null;

      var re = /"itineraryAirportPairs":(\[[^\]]+])/;
      var scriptList = mono.getPageScript(document.body.innerHTML, re);
      scriptList.some(function(script) {
        var m = script.match(re);
        m = m && m[1];
        if (!m) {
          return;
        }
        var jsonList = mono.findJson(m);
        return jsonList.some(function(arr) {
          if (!Array.isArray(arr)) {
            return;
          }
          if (arr.length > 2) {
            error('More two way!');
            return;
          }
          dataArr = arr;
          return true;
        });
      });

      if (!dataArr) {
        error('Data is not found!');
        abort();
        return;
      }

      var originData = dataArr[0];

      if (!originData) {
        error('Origin data is not found! %j', dataArr);
        abort();
        return;
      }

      info.origin = main.validateIataCode(originData.departureCode);
      info.destination = main.validateIataCode(originData.arrivalCode);

      var dateStart = main.reFormatDate(originData.date, /(\d{4})\/(\d{2})\/(\d{2})/, "$1-$2-$3");
      info.dateStart = main.validateDate(dateStart);

      var destData = dataArr[1];

      var dateEnd = main.reFormatDate(destData && destData.date, /(\d{4})\/(\d{2})\/(\d{2})/, "$1-$2-$3");
      dateEnd && (info.dateEnd = main.validateDate(dateEnd));

      var ccy = document.querySelector('#select-currency');
      if (ccy) {
        info.currency = main.validateCcy(ccy.value);
      }

      return cb();
    };

    var details = {
      urlTest: function(url) {
        return /\/webqtrip.html/.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '#outbounds .flight-list .prices-all .prices-amount', is: 'added'},
            {css: '#inbounds .flight-list .prices-all .prices-amount', is: 'added'},
            {css: '#both .flight-list .prices-all .prices-amount', is: 'added'}
          ],
          queriesMap: [
            {name: 'minPriceOut'},
            {name: 'minPriceIn'},
            {name: 'minPriceOut'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.anywayanyday.com/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var url = document.URL;
      var m = url.match(/\/avia\/offers\/(\d{2})(\d{2})(\w{3})(\w{3})(?:(\d{2})(\d{2})(\w{3})(\w{3}))?/);
      if (!m) {
        return abort();
      }
      m.shift();

      var isOneWay = !m[4];

      if (!isOneWay && (m[2] !== m[7] || m[3] !== m[6])) {
        error('More one way in URL!', m);
        return abort();
      }

      var now = new Date();

      var getFormatedDate = function(month, date) {
        var year = now.getFullYear();
        if (now.getMonth() + 1 > parseInt(month)) {
          year += 1;
        }
        return main.validateDate([year, month, date].join('-'));
      };

      var info = main.getInfoObj();

      info.origin = main.validateIataCode(m[2]);
      info.destination = main.validateIataCode(m[3]);

      info.dateStart = getFormatedDate(m[1], m[0]);

      var dateEnd = !isOneWay && getFormatedDate(m[5], m[4]);
      dateEnd && (info.dateEnd = dateEnd);

      cb();
    };

    var details = {
      urlTest: function(url) {
        return /\/avia\/offers\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.b-flight_offers-offers-list .j-buy_button .b-price', is: 'added'},
            {css: '.b-currency-section .b-menu-item-button-text--title', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'},
            {name: 'currency'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.svyaznoy.travel/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'from_code',
        'to_code',
        'from_date',
        'to_date',
        'curDir'
      ], function(varList) {
        if (varList[4] !== '/avia') {
          error('Is not avia page!');
          return abort();
        }

        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);

        var dateStart = main.reFormatDate(varList[2], /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
        info.dateStart = main.validateDate(dateStart);

        var dateEnd = main.reFormatDate(varList[3], /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
        dateEnd && (info.dateEnd = main.validateDate(dateEnd));

        if (document.querySelector('.sum_rub')) {
          info.currency = 'RUB';
        }

        cb();
      });
    };

    var details = {
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.box-results-best .best-results-price', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://avia.tickets.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'avia_form_search_params.from_code',
        'avia_form_search_params.to_code',
        'avia_form_search_params.departure_date',
        'avia_form_search_params.departure_date1',
        'avia_form_search_params.from_code1',
        'avia_form_search_params.to_code1',
        'cur_domain_name'
      ], function(varList) {
        if (varList[6] !== 'avia') {
          error('Is not avia page!');
          return abort();
        }

        if (varList[3] && (varList[0] !== varList[5] || varList[1] !== varList[4])) {
          error('More one way', varList);
          return abort();
        }

        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);

        var dateStart = main.reFormatDate(varList[2], /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
        info.dateStart = main.validateDate(dateStart);

        var dateEnd = main.reFormatDate(varList[3], /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
        dateEnd && (info.dateEnd = main.validateDate(dateEnd));

        cb();
      });
    };

    var details = {
      urlTest: function(url) {
        return /\/search\/results/.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '#offers_table .your_price strong span:not(.hidden)', is: 'added'},
            {css: '.currency_buttons label.ui-button.ui-state-active .ui-button-text', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'},
            {name: 'currency', map: {
              RUR: 'RUB'
            }}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.s7.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var url = document.URL;
      var params = mono.parseUrl(url);

      var info = main.getInfoObj();

      if (params.AA2 && (params.DA1 !== params.AA2 || params.AA1 !== params.DA2)) {
        error('More one way', params);
        return abort();
      }

      if (params.DA1) {
        info.origin = main.validateIataCode(params.DA1);
        if (!info.origin) {
          return abort();
        }
      }

      if (params.AA1) {
        info.destination = main.validateIataCode(params.AA1);
        if (!info.destination) {
          return abort();
        }
      }

      var dateStart = params.DD1;
      info.dateStart = main.validateDate(dateStart);

      var dateEnd = params.DD2;
      dateEnd && (info.dateEnd = main.validateDate(dateEnd));

      info.currency = main.validateCcy(params.CUR);

      cb();
    };

    var hasChanges = function() {
      var out = document.querySelectorAll('#ibe_exact_outbound_flight_table .select-flights span[data-qa="amount"]');
      var _in = document.querySelectorAll('#ibe_exact_inbound_flight_table .select-flights span[data-qa="amount"]');

      main.watchPageTemplates.minPriceOut({
        info: main.getInfoObj()
      }, {added: out});

      main.watchPageTemplates.minPriceIn({
        info: main.getInfoObj()
      }, {added: _in});

      return true;
    };

    var details = {
      urlTest: function(url) {
        return /\/selectExactDateSearchFlights\.action/.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '#ibe_exact_outbound_flight_table .select-flights span[data-qa="amount"]', is: 'added'},
            {css: '#ibe_exact_inbound_flight_table .select-flights span[data-qa="amount"]', is: 'added'},
            {css: '#ibe_exact_outbound_flight_table, #ibe_exact_inbound_flight_table', is: 'removed'}
          ],
          queriesMap: [
            {name: 'minPriceOut'},
            {name: 'minPriceIn'},
            hasChanges
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.kupibilet.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var url = document.URL;
      var m = url.match(/\/search\/(?:\w\d{3})(\d{2})(\w{3})(\w{3})(\w{3})(?:(\d{2})(\w{3})(\w{3})?)?/);

      if (!m) {
        return cb();
      }
      m.shift();

      if (m[6]) {
        error('More two way!', m);
        return abort();
      }

      var isOneWay = !m[4];

      var now = new Date();

      var monthMap = {
        'JAN': '01',
        'FEB': '02',
        'MAR': '03',
        'APR': '04',
        'MAY': '05',
        'JUN': '06',
        'JUL': '07',
        'AUG': '08',
        'SEP': '09',
        'OCT': 10,
        'NOV': 11,
        'DEC': 12
      };

      var getFormatedDate = function(month, date) {
        month = monthMap[month];

        if (!month) {
          return null;
        }

        var year = now.getFullYear();
        if (now.getMonth() + 1 > parseInt(month)) {
          year += 1;
        }
        return main.validateDate([year, month, date].join('-'));
      };

      var info = main.getInfoObj();

      info.origin = main.validateIataCode(m[2]);
      info.destination = main.validateIataCode(m[3]);

      info.dateStart = getFormatedDate(m[1], m[0]);

      var dateEnd = !isOneWay && getFormatedDate(m[5], m[4]);
      dateEnd && (info.dateEnd = dateEnd);

      if (document.querySelector('.fa-rub')) {
        info.currency = 'RUB';
      }

      cb();
    };

    var details = {
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.results-list-next-step li.results-total > div.results-total-sum > span > span', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.trip.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var paramsEl = [].slice.call(document.querySelectorAll('#flights_view_type_tabs a'));
      var url = null;
      paramsEl.some(function(node) {
        var hasParams = /e_travel_flights_search/.test(node.href);
        if (hasParams) {
          url = node.href;
        }
        return hasParams;
      });
      if (!url) {
        return;
      }

      var params = mono.parseUrl(url);

      var info = main.getInfoObj();

      info.origin = main.validateIataCode(params['e_travel_flights_search[from]']);
      info.destination = main.validateIataCode(params['e_travel_flights_search[to]']);

      info.dateStart = main.validateDate(params['e_travel_flights_search[departure]']);

      info.dateEnd = main.validateDate(params['e_travel_flights_search[return]']);

      var ccy = document.querySelector('#localization_selector_currency');
      if (ccy && ccy.value) {
        info.currency = main.validateCcy(ccy.value);
      }

      cb();
    };

    var details = {
      urlTest: function(url) {
        return /\/flights\/searches\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.flights-product-details .price span > a', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.sindbad.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'App.searchModel.attributes.request.src',
        'App.searchModel.attributes.request.dst',
        'App.searchModel.attributes.request.date_out',
        'App.searchModel.attributes.request.date_in'
      ], function(varList) {
        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);
        info.dateStart = main.validateDate(varList[2]);
        varList[3] && (info.dateEnd = main.validateDate(varList[3]));

        if (document.querySelector('.ruble')) {
          info.currency = 'RUB';
        }

        cb();
      });
    };

    var details = {
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.trips .trip-worth .trip-worth__price', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };

    main.initProfile(details);
  };

  main.profileList['*://*.aviakassa.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'APRT_DATA.searchTickets.codeFrom',
        'APRT_DATA.searchTickets.codeDest',
        'APRT_DATA.searchTickets.dateFrom',
        'APRT_DATA.searchTickets.dateTill',
        'APRT_DATA.searchTickets.type'
      ], function(varList) {
        if (varList[4] !== 'avia') {
          return abort();
        }

        if (varList[2] === varList[3]) {
          varList[3] = null;
        }

        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);

        var dateStart = main.reFormatDate(varList[2], /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
        info.dateStart = main.validateDate(dateStart);

        var dateEnd = main.reFormatDate(varList[3], /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
        dateEnd && (info.dateEnd = main.validateDate(dateEnd));

        var ccy = document.querySelector('.price');
        if (ccy) {
          if (/руб\./.test(ccy.textContent)) {
            info.currency = 'RUB';
          }
        }

        cb();
      });
    };

    var details = {
      urlTest: function(url) {
        return /\/results\//.test(url);
      },
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '#resultList .flight-result .price', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.biletix.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();
      main.getParamsFromPage([
        'xcnt_transport_from',
        'xcnt_transport_to',
        'xcnt_transport_depart_date',
        'xcnt_transport_return_date',
        'APRT_DATA.searchTickets.type'
      ], function(varList) {
        if (varList[4] !== 'avia') {
          return abort();
        }

        info.origin = main.validateIataCode(varList[0]);
        info.destination = main.validateIataCode(varList[1]);

        var dateStart = main.reFormatDate(varList[2], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        info.dateStart = main.validateDate(dateStart);

        var dateEnd = main.reFormatDate(varList[3], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        dateEnd && (info.dateEnd = main.validateDate(dateEnd));

        var ccy = document.querySelector('#currency_form .selected input[name="currency"]');
        if (ccy) {
          ccy = ccy.value;
          if (ccy === 'RUR') {
            ccy = 'RUB';
          }
          info.currency = main.validateCcy(ccy);
        }

        cb();
      });
    };

    var details = {
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.offers .offer .price .caption', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.utair.ru/*'] = function() {
    var getSearchParams = function(cb, abort) {
      var info = main.getInfoObj();

      var origin = document.querySelector('.location.departure .code');
      info.origin = origin && main.validateIataCode(origin.textContent);

      var destination = document.querySelector('.location.arrival .code');
      info.destination = destination && main.validateIataCode(destination.textContent);

      var ccy = document.querySelector('input#matrixcurrency[name="currency"]');
      if (ccy) {
        info.currency = main.validateCcy(ccy.value);
      }

      main.getParamsFromPage([
        'cfg_split_fares.selected_date_to',
        'cfg_split_fares.selected_date_back'
      ], function(varList) {
        var dateStart = main.reFormatDate(varList[0], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        info.dateStart = main.validateDate(dateStart);

        var dateEnd = main.reFormatDate(varList[1], /(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
        dateEnd && (info.dateEnd = main.validateDate(dateEnd));

        cb();
      });
    };

    var hasChanges = function(summary) {
      if (!summary.removed.length) {
        return false;
      }

      var info = main.getInfoObj();
      for (var key in info) {
        delete info[key];
      }

      return true;
    };

    var details = {
      baseInfo: ['origin', 'destination', 'dateStart', 'currency'],
      getBaseInfo: function(cb, abort) {
        getSearchParams(cb, abort);
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.direction.direction-to .price', is: 'added'},
            {css: '.direction.direction-back .price', is: 'added'},
            {css: '.direction .price', is: 'removed'}
          ],
          queriesMap: [
            {name: 'minPriceOut'},
            {name: 'minPriceIn'},
            hasChanges
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.booking.*/*'] = function() {
    var details = {
      urlTest: function(url) {
        return /\/hotel\//.test(url);
      },
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        var hotelName = document.querySelector('#hp_hotel_name');
        hotelName = hotelName && hotelName.textContent.trim();

        if (!hotelName) {
          return abort();
        }

        main.getParamsFromPage([
          'utag_data.city_name',
          'utag_data.country_name',
          'utag_data.date_in',
          'utag_data.date_out',
          'utag_data.currency',
          'utag_data.adults'
        ], function(varList) {
          var info = main.getInfoObj();

          info.type = 'hotel';

          info.name = hotelName;

          info.query = [hotelName];
          if (varList[0] && varList[1]) {
            info.query.unshift(hotelName + ' ' + varList[0] + ' ' + varList[1]);
          } else
          if (varList[0]) {
            info.query.unshift(hotelName + ' ' + varList[0]);
          } else
          if (varList[1]) {
            info.query.unshift(hotelName + ' ' + varList[1]);
          }

          info.dateIn = main.validateDate(varList[2]);
          info.dateOut = main.validateDate(varList[3]);

          info.currency = main.validateCcy(varList[4]);

          info.adults = main.validateAdults(varList[5]);

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.booking_summary .roomPrice strong', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.agoda.*/*'] = function() {
    var priceSelector = [
      '#room-grid-table .price span.crossout',
      '#room-grid-table .price span.sellprice'
    ];

    var onPriceChange = function(summary) {
      var info = main.getInfoObj();

      var ccy = document.getElementById('currency');
      ccy && (ccy = ccy.textContent);
      ccy && (ccy = main.validateCcy(ccy));

      if (info.currency !== ccy) {
        info.currency = ccy;
        info.oneDayPrice = null;
        info.price = null;
      }

      var _info = {
        price: info.oneDayPrice
      };

      var hasChanges = main.watchPageTemplates.price({
        info: _info
      }, summary);

      if (!hasChanges) {
        return hasChanges;
      }

      var count = document.querySelector('#defLos');
      count && (count = parseInt(count.value));

      info.oneDayPrice = _info.price;
      info.price = count * _info.price;

      return hasChanges;
    };

    var getOutDate = function(dateIn, days) {
      var now = new Date(dateIn);
      var time = now.getTime();
      time += days * 24 * 60 * 60 * 1000;
      now = new Date(time);

      var year = now.getFullYear();
      var month = now.getMonth() + 1;
      if (month < 10) {
        month = '0' + month;
      }
      var date = now.getDate();
      if (date < 10) {
        date = '0' + date;
      }
      return main.validateDate([year, month, date].join('-'));
    };

    var details = {
      urlTest: function(url) {
        return /\/hotel\//.test(url);
      },
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'adults'],
      getBaseInfo: function(cb, abort) {
        var hotelName = document.querySelector('#hotelname');
        hotelName && (hotelName = hotelName.textContent.trim());

        var rooms = document.querySelector('#noOfRooms');
        rooms && (rooms = rooms.value);

        if (!hotelName || rooms !== '1') {
          return abort();
        }

        var info = main.getInfoObj();

        info.type = 'hotel';
        info.name = hotelName;
        info.query = [hotelName];

        var dateIn = document.querySelector('#checkIn');
        dateIn && (dateIn = dateIn.value);
        info.dateIn = main.validateDate(dateIn);

        var count = document.querySelector('#defLos');
        count && (count = count.value);
        info.dateOut = getOutDate(info.dateIn, count);

        var adults = document.querySelector('#noOfAdults');
        adults && (adults = adults.value);
        info.adults = main.validateAdults(adults);

        main.getParamsFromPage([
          'rtag_cityname'
        ], function(varList) {
          var city = varList[0];
          if (city) {
            info.query.unshift(hotelName + ' ' + city);
          }

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: priceSelector, is: 'added'}
          ],
          queriesMap: [
            onPriceChange
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.hotels.com/*'] = function() {
    var details = {
      urlTest: function(url) {
        return /\/hotel\/|\/ho\d+\//.test(url);
      },
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        main.getParamsFromPage({
          dateIn: 'commonDataBlock.search.checkinDate',
          dateOut: 'commonDataBlock.search.checkoutDate',
          name: 'commonDataBlock.property.hotelName',
          country: 'commonDataBlock.property.country',
          city: 'commonDataBlock.property.city',
          ccy: 'commonDataBlock.property.featuredPrice.currency',
          rooms: 'commonDataBlock.search.numRooms',
          searchRooms: 'commonDataBlock.search.rooms'
        }, function(dataObj) {
          if (dataObj.rooms !== 1 || !Array.isArray(dataObj.searchRooms) || dataObj.searchRooms.length !== 1 || !dataObj.searchRooms[0]) {
            return abort();
          }

          var info = main.getInfoObj();

          info.type = 'hotel';

          var name = document.querySelector('.vcard h1');
          name = name && name.textContent || dataObj.name;
          info.name = name;

          info.query = [dataObj.name];

          if (dataObj.city && dataObj.country) {
            info.query.unshift(dataObj.name + ' ' + dataObj.city + ' ' + dataObj.country);
          } else
          if (dataObj.city) {
            info.query.unshift(dataObj.name + ' ' + dataObj.city);
          } else
          if (dataObj.country) {
            info.query.unshift(dataObj.name + ' ' + dataObj.country);
          }

          info.dateIn = main.validateDate(dataObj.dateIn);
          info.dateOut = main.validateDate(dataObj.dateOut);
          info.currency = main.validateCcy(dataObj.ccy);
          info.adults = main.validateAdults(dataObj.searchRooms[0].numAdults);

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '#rooms-and-rates .current-price', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.ostrovok.ru/*'] = function() {
    var onPageChange = function(summary) {
      if (!summary.removed.length) {
        return;
      }

      log('page change!');

      main.closeCurrentBar();

      var info = main.getInfoObj();
      for (var key in info) {
        delete info[key];
      }
    };

    var details = {
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        if (!/\/rooms\//.test(document.URL)) {
          return cb();
        }

        main.getParamsFromPage([
            'checkin',
            'checkout',
            'region_name',
            'adults'
          ], function(varList) {
          var info = main.getInfoObj();

          info.type = 'hotel';

          var name = document.querySelector('h1.hotel-header-title');
          name = name && name.textContent;
          info.name = name;

          info.query = [name];
          var region = varList[2];
          if (region) {
            info.query.unshift(name + ' ' + region);
          }

          info.dateIn = main.validateDate(varList[0]);
          info.dateOut = main.validateDate(varList[1]);
          info.adults = main.validateAdults(varList[3]);

          var ccy = document.querySelector('.currency-select-value');
          ccy = ccy && ccy.textContent;

          info.currency = main.validateCcy(ccy);

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: 'h1.hotel-header-title', is: 'removed'},
            {css: '.hotel-header-price-value', is: 'added'}
          ],
          queriesMap: [
            onPageChange,
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.travel.ru/*'] = function() {
    var details = {
      urlTest: function(url) {
        return /\/hotel\//.test(url);
      },
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        var ccy = document.querySelector('.switcher-city button');
        ccy = ccy && ccy.textContent;
        ccy = ccy && ccy.match(/([A-Z]{3})/);
        ccy = ccy && ccy[1];

        var name = document.querySelector('h1.b-hotel_title');
        name = name && name.textContent;
        name = name && name.trim();

        if (!ccy || !name) {
          return abort();
        }

        var url = document.URL;
        var params = mono.parseUrl(url);

        var info = main.getInfoObj();
        info.type = 'hotel';

        var dateIn = params.in;
        dateIn = main.reFormatDate(dateIn, /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");

        var dateOut = params.out;
        dateOut = main.reFormatDate(dateOut, /(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");

        info.name = name;
        info.query = [name];
        info.dateIn = main.validateDate(dateIn);
        info.dateOut = main.validateDate(dateOut);
        info.adults = main.validateAdults(params.occ);
        info.currency = main.validateCcy(ccy);

        cb();
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.b-av .b-av-rate_price_rub', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.oktogo.ru/*'] = function() {
    var details = {
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        main.getParamsFromPage([
          'APRT_DATA.currentProduct.name',
          'APRT_DATA.searchTickets.dateFrom',
          'APRT_DATA.searchTickets.dateTill',
          'APRT_DATA.searchTickets.count',
          'currency',
          'APRT_DATA.searchTickets.type',
          'APRT_DATA.searchTickets.country',
          'APRT_DATA.searchTickets.dest'
        ], function(varList) {
          if (varList[5] !== 'hotel' || !varList[0]) {
            return cb();
          }

          var info = main.getInfoObj();
          info.type = 'hotel';
          info.name = varList[0];

          var query = [varList[0]];
          if (varList[7] && varList[6]) {
            query.unshift(varList[0] + ' ' + varList[7] + ' ' + varList[6]);
          } else
          if (varList[7]) {
            query.unshift(varList[0] + ' ' + varList[7]);
          } else
          if (varList[6]) {
            query.unshift(varList[0] + ' ' + varList[6]);
          }

          info.query = query;

          info.dateIn = main.validateDate(varList[1]);
          info.dateOut = main.validateDate(varList[2]);
          info.adults = main.validateAdults(varList[3]);
          info.currency = main.validateCcy(varList[4]);

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.priceContainer *[data-price="period-price"] span.rub', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.roomguru.ru/*'] = function() {
    var details = {
      urlTest: function(url) {
        return /\/Hotel\//.test(url);
      },
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        var params = mono.parseUrl(document.URL);
        var adults = params.adults_1;

        var place = params.destination || '';
        place = place.match(/place:(.+)/);
        place = place && place[1];

        var name = document.querySelector('h1.hc_htl_intro_name');
        name = name && name.textContent;
        if (!name) {
          return abort();
        }

        var query = [name];
        if (place) {
          query.unshift(name + ' ' + place);
        }

        main.getParamsFromPage([
          'HC.Common.fields',
          'gCurrencyCode'
        ], function(varList) {
          if (!varList[0] || !varList[1]) {
            return abort();
          }

          var fields = varList[0];

          var info = main.getInfoObj();
          info.type = 'hotel';

          info.dateIn = main.validateDate(fields.checkin);
          info.dateOut = main.validateDate(fields.checkout);
          info.currency = main.validateCcy(varList[1]);

          info.name = name;
          info.query = query;

          info.adults = main.validateAdults(adults);

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '#hc_htl_pm_rates_content .hc_tbl_col2 #TotalLink', is: 'added'}
          ],
          queriesMap: [
            {name: 'price'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.tripadvisor.ru/*'] = function() {
    var onPriceChange = function(summary) {
      var info = main.getInfoObj();

      var _info = {
        price: info.oneDayPrice
      };

      var hasChanges = main.watchPageTemplates.price({
        info: _info
      }, summary);

      if (!hasChanges) {
        return hasChanges;
      }

      var dateIn = new Date(info.dateIn);
      var dateOut = new Date(info.dateOut);
      var count = Math.round((dateOut.getTime() - dateIn.getTime()) / 24 / 60 / 60 / 1000);

      info.oneDayPrice = _info.price;
      info.price = count * _info.price;

      return hasChanges;
    };

    var details = {
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        var query = document.querySelector('h1.header');
        query = query && query.textContent;
        if (query) {
          query = query.trim();
        }

        var name = document.querySelector('h1.heading_name');
        if (name) {
          name = name.cloneNode(true);
          var altHead = name.querySelector('.altHead');
          if (altHead) {
            altHead.parentNode.removeChild(altHead);
          }
          name = name.textContent.trim();
        }


        var tree = document.querySelector('.impressionTrackingTree');
        tree = tree && tree.innerHTML;

        if (!tree) {
          return abort();
        }

        var ccy = tree.match(/\\PC:([A-Z]{3})\\/);
        ccy = ccy && ccy[1];

        var dateIn = tree.match(/\\CI:(\d{4}-\d{2}-\d{2})\\/);
        dateIn = dateIn && dateIn[1];

        var dateOut = tree.match(/\\CO:(\d{4}-\d{2}-\d{2})\\/);
        dateOut = dateOut && dateOut[1];

        if (!name || !ccy || !dateIn || !dateOut) {
          return abort();
        }

        components.bridge({
          func: function(cb) {
            var rList = [];

            rList.push(ta.retrieve('multiDP.adultsCount'));

            cb(rList);
          },
          cb: function(data) {
            if (!data || !data[0]) {
              return abort();
            }

            var info = main.getInfoObj();
            info.type = 'hotel';

            info.dateIn = main.validateDate(dateIn);
            info.dateOut = main.validateDate(dateOut);
            info.currency = main.validateCcy(ccy);

            info.name = name;
            info.query = [name];
            if (query) {
              info.query.unshift(query);
            }

            info.adults = main.validateAdults(data[0]);

            cb();
          }
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.viewDealChevrons .price', is: 'added'}
          ],
          queriesMap: [
            onPriceChange
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.hilton.com/*'] = function() {
    var details = {
      urlTest: function(url) {
        return /\/reservation\//.test(url);
      },
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults'],
      getBaseInfo: function(cb, abort) {
        var name = document.querySelector('h2.hotelNameNoLink');
        name = name && name.textContent;

        var roomsAdults = document.querySelector('.sumOccupancy');
        roomsAdults = roomsAdults && roomsAdults.textContent;

        var ccy = document.querySelector('select#changeCurrency');
        ccy = ccy && ccy.value;

        if (!name || !roomsAdults || !ccy) {
          return abort();
        }

        main.getParamsFromPage({
          dateInfo: 'digitalData.page.attributes.propertySearchDateInfo'
        }, function(dataObj) {
          if (!dataObj.dateInfo) {
            return abort();
          }

          var info = main.getInfoObj();
          info.type = 'hotel';

          info.name = name;
          info.query = [name];

          roomsAdults = roomsAdults.match(/(\d+)/g);
          if (roomsAdults[0] !== '1') {
            return abort();
          }
          info.adults = main.validateAdults(roomsAdults[1]);


          info.currency = main.validateCcy(ccy);

          var searchDetails = dataObj.dateInfo.split(':');

          var dateIn = searchDetails[1];
          dateIn = main.reFormatDate(dateIn, /(\d{2})(\d{2})(\d{4})/, "$3-$1-$2");
          info.dateIn = main.validateDate(dateIn);

          var dateOut = searchDetails[2];
          dateOut = main.reFormatDate(dateOut, /(\d{2})(\d{2})(\d{4})/, "$3-$1-$2");
          info.dateOut = main.validateDate(dateOut);

          if (info.dateIn && info.dateOut) {
            dateIn = new Date(info.dateIn);
            dateOut = new Date(info.dateOut);
            info.dayCount = Math.round((dateOut.getTime() - dateIn.getTime()) / 24 / 60 / 60 / 1000);
          }

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.price .priceamount', is: 'added'}
          ],
          queriesMap: [
            {name: 'oneDayPrice'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

  main.profileList['*://*.marriott.com/*'] = function() {
    var details = {
      urlTest: function(url) {
        return /\/reservation\//.test(url);
      },
      baseInfo: ['name', 'query', 'dateIn', 'dateOut', 'currency', 'adults', 'dayCount'],
      getBaseInfo: function(cb, abort) {
        main.getParamsFromPage({
          dataLayer: 'dataLayer'
        }, function(dataObj) {
          if (!dataObj.dataLayer) {
            return abort();
          }

          if (dataObj.dataLayer.numRooms > 1) {
            return abort();
          }

          var info = main.getInfoObj();
          info.type = 'hotel';

          info.name = dataObj.dataLayer.prop_name;

          info.query = [info.name];
          if (dataObj.dataLayer.prop_address_city) {
            info.query.unshift(info.name + ' ' + dataObj.dataLayer.prop_address_city);
          };

          info.adults = main.validateAdults(dataObj.dataLayer.numGuestsPerRoom);


          info.currency = main.validateCcy(dataObj.dataLayer.prop_currency_type);

          var dateIn = dataObj.dataLayer.chckInDat;
          dateIn = main.reFormatDate(dateIn, /(\d{2})\/(\d{2})\/(\d{2})/, "20$3-$1-$2");
          info.dateIn = main.validateDate(dateIn);

          var dateOut = dataObj.dataLayer.chckOutDate;
          dateOut = main.reFormatDate(dateOut, /(\d{2})\/(\d{2})\/(\d{2})/, "20$3-$1-$2");
          info.dateOut = main.validateDate(dateOut);

          info.dayCount = main.validateNumber(dataObj.dataLayer.nmbNights);

          cb();
        });
      },
      watcher: function(onChange) {
        main.watchPage({
          queries: [
            {css: '.results-container .t-price', is: 'added'}
          ],
          queriesMap: [
            {name: 'oneDayPrice'}
          ]
        }, function() {
          onChange();
        });
      }
    };
    main.initProfile(details);
  };

}, function isAvailable(initData) {
  "use strict";
  var preference = initData.getPreference;

  if (!preference.hasAviaBar) {
    return false;
  }

  if (!preference.aviaBarEnabled) {
    return false;
  }

  if (document.body.parentNode.dataset.travelBar) {
    return false;
  }
  document.body.parentNode.dataset.travelBar = 1;

  return true;
}, function syncIsAvailable() {
  "use strict";
  if (mono.isIframe()) {
    return false;
  }

  var list = [
    '*://*.ozon.travel/*',
    '*://*.onetwotrip.com/*',
    '*://*.skyscanner.*/*',
    '*://*.aeroflot.ru/*',
    '*://*.momondo.*/*',
    '*://*.anywayanyday.com/*',
    '*://*.svyaznoy.travel/*',
    '*://avia.tickets.ru/*',
    '*://*.s7.ru/*',
    '*://*.kupibilet.ru/*',
    '*://*.trip.ru/*',
    '*://*.sindbad.ru/*',
    '*://*.aviakassa.ru/*',
    '*://*.biletix.ru/*',
    '*://*.utair.ru/*',

    '*://*.kayak.*/*',
    '*://*.orbitz.com/*',
    '*://*.travelocity.com/*',
    '*://*.expedia.com/*',
    '*://*.priceline.com/*',

    '*://*.booking.*/*',
    '*://*.agoda.*/*',
    '*://*.hotels.com/*',
    '*://*.ostrovok.ru/*',
    '*://*.travel.ru/*',
    '*://*.oktogo.ru/*',
    '*://*.roomguru.ru/*',
    '*://*.tripadvisor.ru/*',
    '*://*.hilton.com/*',
    '*://*.marriott.com/*'
  ];

  for (var i = 0, item; item = list[i]; i++) {
    var re = new RegExp(mono.urlPatternToStrRe(item));
    if (re.test(location.protocol + '//' + location.hostname)) {
      mono.global.aviaBarProfile = item;
      mono.global.exAviaBar = true;
      return true;
    }
  }

  return false;
});