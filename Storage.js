
(function(e){
   e()
})(function(){
// var ready=document.createEvent("CustomEvent")
// ready.initCustomEvent("ready")
// var ready = new CustomEvent("ready",{detail:99})
// ready
// console.log(onload);
function Storage(db_name, tb_name,unique) {
    if ("string" !== typeof db_name || "string" !== typeof tb_name) {
        console.error("storage", "invalid")
        return
    }
    var db;
    var closed;
    var event = window.eventTarget();
    event.addEventListener("ready", function () {
        db = arguments[0].detail;
        // console.log(db);
        queue.forEach(function (v) {
            var arg = v[0];
            var res = v[1]
            item(arg[0], arg[1], arg[2], arg[3] || res, arg[4], arg[5])
        })
    })

    db_name = toNimoName(db_name)
    // console.log(db_name);
    var obj = this;
    var queue = []


    function item(arg, method, _return, res, foo, quick_rt) {
        var promise;
        if (!res) {
            promise = new Promise(function () {
                res = arguments[0]
            })
        }
        if (quick_rt) {
            res(quick_rt[0])
            return promise
        }

        if (db) {
            if (IDBObjectStore.prototype.hasOwnProperty(method)) {
                var trans = db;
                if (arg !== null) {
                    trans = trans.transaction(tb_name, 'readwrite').objectStore(tb_name)
                    trans = trans[method](arg[0], arg[1], arg[2])
                }
                // console.log(trans);
                if (foo) {
                    foo(trans, res, _return)
                } else {
                    arg !== null && (trans.onsuccess = function () {
                        closeTrans(trans)
                        if (_return) {
                            res(storeOBJ(trans.result))
                        } else {
                            res(true)
                        }
                    })
                }
            }
        } else {
            queue.push([arguments, res])
        }
        return promise
    }

    obj.setItem = function (key, v) {
        v = { value: unique?key:v }
        if(!unique)v[keyPath] = key;
        return item([v], "put", false, null, null, !isValidKey("gg") && [])
    };

    obj.getItem = function (key) {
        return item([key], "get", true, null, null, !isValidKey(key) && [])
    };

    obj.removeItem = function (key) {
        return item([key], "delete", false, null, null, !isValidKey(key) && [])
    };

    obj.clear = function () {
        return item([], "clear", false)
    };

    obj.getAllItem = function (foo, return_list) {
        var list = {}
        return item([], "openCursor", true, null, function (trans, res, _return) {
            trans.onsuccess = function () {
                var rst = trans.result
                if (rst) {
                    var key = rst.key;
                    "function" === typeof foo && foo(storeOBJ(rst.value) , key, function() {
                        rst.continue=function() {
                            
                        };
                    });
                    if (!return_list) {
                        if (list.hasOwnProperty(key)) {
                            list.__proto__[key] = storeOBJ(rst.value)
                        } else {
                            list[key] = storeOBJ(rst.value)
                        }
                    }
                    // console.log(trans,rst);
                    rst.continue();
                } else {
                    closeTrans(trans)
                    res(list)
                }
            }
        })
    };

    obj.key = function (index) {
        // console.warn(obj, "Storage.key not cross browser supported")
        return item([], "openKeyCursor", true, null, function (trans, res, _return) {
            var targetIndex = 0;
            trans.onsuccess = function () {
                var rst = trans.result
                if (rst) {
                    if (index === targetIndex) {
                        closeTrans(trans)
                        res(rst.key)
                    } else {
                        rst.continue();
                    }
                    targetIndex++;
                } else {
                    closeTrans(trans)
                    res(void 0)
                }
            }
        }, !isValidKey(key) && [])
    };

    obj.keys = function () {
        // console.warn(obj, "Storage.keys not cross browser supported")
        return item([], "getAllKeys", true, null, function (trans, res, _return) {
            if (trans instanceof IDBObjectStore) {
                trans = trans.openCursor()
                var list = []
                trans.onsuccess = function () {
                    var rst = trans.result
                    if (rst) {
                        list.push(rst.key)
                        rst.continue();
                    } else {
                        closeTrans(trans)
                        res(list)
                    }
                }
            } else {
                trans.onsuccess = function () {
                    closeTrans(trans)
                    if (_return) {
                        res(storeOBJ(trans.result))
                    } else {
                        res(true)
                    }
                }
            }
        })
    };

    obj.has = function (key) {
        return item([], "openCursor", true, null, function (trans, res, _return) {
            trans.onsuccess = function () {
                var rst = trans.result
                if (rst) {
                    if (key === rst.key) {
                        closeTrans(trans)
                        res(true)
                    } else {
                        rst.continue();
                    }
                } else {
                    closeTrans(trans)
                    res(false)
                }
            }
        }, !isValidKey(key) && [false])
    };
    obj.length = function () {
        return item([], "count", true)
    }
    obj.close = function () {
        return item(null, "me", true, null, function (trans, res, _return) {
            // trans = trans.transaction.db;
            if (!closed) {
                trans.close();
                closed = true
            }
            // console.log(trans);
            res();
        })
    }

    records && globalEventListener.addEventListener('close', function () {
        obj.close()
        globalEventListener.removeEventListener('close', arguments.callee)
    })

    globalEventListener.addEventListener('close:'+db_name, function () {
        obj.close()
        globalEventListener.removeEventListener('close', arguments.callee)
    })
    
    opener(db_name, tb_name, event, !(!records),unique)
}


// var obj = Storage.prototype//={}

var opener = function (db, tb, event, track,unique) {
    var d = indexedDB.open(db)
    d.onsuccess = function () {
        if (track) {
            records.has(db.real + "").then(function (e) {
                // console.log(records.);

                if (!e) {
                    records.setItem(db.real + "", {
                        name: db + "",
                        info: {
                            date: [
                                new Date().toDateString(),
                                new Date().toLocaleDateString()
                            ],
                            exactDate: Date.now(),
                            Agent: "Storage"
                        }
                    })
                }
            });
        }
        var r = d.result
        var v = r.version;
        if (r.objectStoreNames.contains(tb)) {
            opener_transact(tb, r, event)
        } else {
            r.close();
            d = indexedDB.open(db, v += 1)
            d.onupgradeneeded = function () {
                r = d.result
                v = r.version;
                var obj = {
                    // keyPath: keyPath,
                    // autoIncrement:true
                };
                if(unique) {
                    obj.autoIncrement=true
                }else{
                    obj.keyPath=keyPath
                }
                var objStore = r.createObjectStore(tb, obj)
                objStore.transaction.oncomplete = function () {
                    opener_transact(tb, r, event)
                }
            }
        }
    }
}

var opener_transact = function (id, r, event) {
    // var db = r.transaction(id, 'readwrite').objectStore(id);
    // db=r
    event.dispatchEvent(new CustomEvent("ready", { detail: r }))
}

var closeTrans = function (trans) {
    trans.transaction.commit && trans.transaction.commit();
    trans.transaction.about && trans.transaction.about();
}

var records;
var keyPath = "NIMO_DB_ID"
var tmp = '[hyper database 2003]'
var SynNAME = location.origin
var def = 'records'
var _name = keyPath;
var hint = "NIMO:"

var toNimoName = function (x, y) {
    if (!y && !x) {
        _console.error('invalid name');
    }
    // var s=x;
    var name = x + tmp
    name = new String(hint + encode(name));
    name.real = x
    return name;
}

var isValidKey = function (key) {
    var type = typeof key;
    return (type.match(/number|string/)) && true
}

var encode = function (x, y) {
    if (!y) {
        x = parseString(x);
    }
    x = x[1]
    x = btoa(x)
    return x;
}

var parseString = function (x) {
    x = String(x);
    var idx = x.indexOf(':');
    var sub_1 = x.substring(0, idx),
        sub_2 = x.substring(idx + 1, x.length)
    return [sub_1, sub_2]
}

var storeOBJ = function (e) {
    if ('object' == typeof e && e.hasOwnProperty("value")) {
        e = e.value;
    }
    return e;
}

if (!IDBObjectStore.prototype.hasOwnProperty("openKeyCursor")) {
    IDBObjectStore.prototype.openKeyCursor = IDBObjectStore.prototype.openCursor
}
if (!IDBObjectStore.prototype.hasOwnProperty("getAllKeys")) {
    IDBObjectStore.prototype.getAllKeys = function () {
        return this
    }
}

IDBObjectStore.prototype.me = function () {
    return this
}


window._EventTarget = function () {
    if ((this instanceof Window)) {
        console.error("illegal constructor")
        return
    }

    var ev = arguments.callee.elm.cloneNode()
    this.addEventListener = function () {
        ev.addEventListener(arguments[0], arguments[1], arguments[2])
    }
    this.dispatchEvent = function () {
        ev.dispatchEvent(arguments[0], arguments[1], arguments[2])
    }
    this.removeEventListener = function () {
        ev.removeEventListener(arguments[0], arguments[1], arguments[2])
    }
}
window._EventTarget.elm = document.createElement("div")
window.eventTarget = function () {
    try {
        return new EventTarget()
    } catch (error) {
    }
    return new _EventTarget()
}
var _event = function(key){
    var ev=document.createEvent("Event");
    ev.initEvent(key)
   return ev
}

var globalEventListener = eventTarget();
var event_close = _event('close')

Storage.deleteAllCreatedDatabase = function () {
    globalEventListener.dispatchEvent(event_close)
    var init = 0;
    var res;
    var log = []
    var sync;
    return new Promise(function (r) {
        records.getAllItem(function (key, val, end) {
            init++;
            var id = init;
            records.removeItem(key)
            var db = indexedDB.deleteDatabase(val.name)
            db.onblocked = db.onerror =/*= function (e) {
                console.log('err', e);
            }*/
            db.onsuccess = function (e) {

                if (res === id) {
                    r(true)
                } else if (!sync && id === init) {
                    sync = true
                }
                // else if(res===void 0){
                //     res = 'done';
                // }
                // console.log(e, log);
            }
        }, true).then(function () {
            res = init;
            if (res) {
                if (sync) {
                    r(true)
                }
            } else {
                r()
            }
        });
    })
}
Storage.deleteCreatedDatabase = function (key) {
    return new Promise(function (r) {
        records.getItem(key).then(function (val) {
            if (!val) {
                return
            }
            globalEventListener.dispatchEvent(_event("close:"+val.name))
            records.removeItem(key)
            var db = indexedDB.deleteDatabase(val.name)
            db.onblocked = db.onerror =db.onsuccess = function (e) {
                r()
            }
        });
    })
}

records = /*Storage.records = */new Storage(_name, def, true)

// setTimeout(function () {
    // Storage.deleteAllCreatedDatabase().then(function (e) {
    //     console.log(777);
    // });
// }, 6000)
window.Storage= Storage;
})