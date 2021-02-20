function GetFormattedDate() {
    var todayTime = new Date();
    var month = (todayTime .getMonth() + 1).toString;
    var day = (todayTime .getDate()).toString;
    var year = (todayTime .getFullYear()).toString;
    return (month + "/" + day + "/" + year).toString();
}

module.exports = {
    GetFormattedDate
}