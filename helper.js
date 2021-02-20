function GetFormattedDate() {
    var todayTime = new Date();
    var month = format(todayTime .getMonth() + 1);
    var day = format(todayTime .getDate());
    var year = format(todayTime .getFullYear());
    return (month + "/" + day + "/" + year).toString();
}

module.exports = {
    GetFormattedDate
}