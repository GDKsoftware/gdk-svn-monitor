var appsettings = require('./appsettings').getAppSettings();


var SVN = require('svn'),
    io = require('socket.io').listen(appsettings.serveport),
    svn,
    spawns = [];

var RestClient = false,
    rest_auth = false,
    rest = false;

var AppSQL = require('./appsql.js').AppSQL,
    AppDB = new AppSQL();

var websocketclients = [];


if (appsettings.useredmine) {
    RestClient = require('node-rest-client').Client;
    rest_auth = {user: appsettings.redmine.user, password: appsettings.redmine.password};
    rest = new RestClient(rest_auth);
}


// Repo settings

io.sockets.on('connection', function(socket) {
    socket.emit("welcome", {});

    websocketclients.push({socket: socket, lastdt: 0});
});

// Loop repos
function initApp() {
    if (appsettings.usemysql) {
        AppDB.init(appsettings.mysql);

        AppDB.getReposFromDb(function(row) {
            spawns.push({
                settings: row,                  // be sure there a column 'name'
                svn: new SVN("", row.svnpath)   // .svnpath is our specific db table column
            });
        });
    } else {
        // if not using mysql database, get the repos directly from appsettings.js
        appsettings.repositories.forEach(function(item) {
            // Create for each repo an svn entry
            spawns.push({
                settings: item,
                svn: new SVN(item.local, item.remote)
            });
        });
    }
}

function lookupInRedmine(logmessage, callback) {
    var regex = /#([0-9]*)/g;

    var allids = [];

    var find;
    while (find = regex.exec(logmessage)) {
        var issueid = find[1];

        allids[allids.length] = issueid;
    }

    for (var i in allids) {
        var url = appsettings.redmine.issuesurl + allids[i] + ".json";

        var req = rest.get(url, function(data, response) {
            if (data) {
                try {
                    var jsondata = JSON.parse(data);
                    if (jsondata) {
                        callback(jsondata);
                    }
                } catch (e) {

                }
            }
        });
    }
}

function customEmit(revdtstr, msg, data) {
    var dt = revdtstr;
//    console.log(revdtstr + " = " + dt);

    websocketclients.forEach(function(client) {
        if (dt > client.lastdt) {
            client.lastdt = dt;
            client.socket.emit(msg, data);
        }
    });
}

var getLogs = function() {
  // Loop spawns
  spawns.forEach(function(spawnEntry) {
    var repName = spawnEntry.settings.name;

    // Request SVN log of current repo
    spawnEntry.svn.log({
      limit: 10
    }, function(error, result) {
        if (error) {
            console.log(error);
        } else {
            result.reverse();

            result.forEach( function(logentry) {
                // Emit results to clients
                customEmit(logentry.date, "logentry-update", {
                    repo: repName,
                    data: logentry
                });

/*
                io.sockets.emit('logentry-update', {
                    repo: repName,
                    data: logentry
                });
 */

                if (appsettings.useredmine && logentry.message) {
                    lookupInRedmine(logentry.message, function(issue) {
                        io.sockets.emit('redmine-update', {
                            repo: repName,
                            rev: logentry.revision,
                            issue: issue.issue
                        });
                    });
                }
            });
        }
    });
  });
};


initApp();

setInterval(function() {
    getLogs();
}, 10000);  // Reminder, this is in milliseconds, not in seconds...


/*
lookupInRedmine("test #10491 and #10492", function(issue) {
    console.log(issue);
});
*/
