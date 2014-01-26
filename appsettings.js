module.exports.getAppSettings = function() {
    return {
        serveport: 8080,
        usemysql: false,
        mysql: {
            host: "localhost",
            port: 3306,
            user: "root",
            password: "",
            dbname: "repohelperdb"
        },
        useredmine: false,
        redmine: {
            issuesurl: "http://redmineserver/issues/",
            user: "readonlyuser",
            password: "pass"
        },
        repositories: []
    };
};
