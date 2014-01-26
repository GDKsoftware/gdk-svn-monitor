
module.exports.AppSQL = function() {
    this.mysql = require('mysql');
    this.db = false;
    this.debug = true;

    this.init = function(mysqlsettings) {
        this.db = this.mysql.createConnection(mysqlsettings);

        this.db.connect(function(err) {
            if (this.debug) {
                console.log(err);
            }
        });

        this.db.query("USE " + mysqlsettings.dbname + ";", function(err) {
            if (this.debug) {
                console.log(err);
            }
        });
    };

    this.fini = function() {
        this.db.end(function(err) {
            if (this.debug) {
                console.log(err);
            }
        });
    };

    this.getReposFromDb = function(callback) {
        sql = "select name, svnpath from repositories order by id asc";

        this.db.query(sql, function(err, rows) {
            if (err) {
                if (this.debug) {
                    console.log(err);
                }
            } else {
                for (var i in rows) {
                    callback(rows[i]);
                }
            }

            //this.db.release();
        });
    };
}
