function GetFormattedDate() {
    var todayTime = new Date();
    var month = (todayTime .getMonth() + 1);
    var day = (todayTime .getDate());
    var year = (todayTime .getFullYear());
    return (day + "/" + month + "/" + year);
}

module.exports = {
    GetFormattedDate
}