// We only use console info, warn and error with specific colors
// console log addons
console.system = function(data, ...args) {
    console.log(data.underline, ...args);
}
console.alert = function(data, ...args) {
    console.log(data.green, ...args);
}
console.error = function(data, ...args) {
    console.log(data.red, ...args);

}
console.info = function(data, ...args) {
    console.log(data.gray, ...args);

}
console.owner = function(data, ...args) {
    console.log(data.inverse, ...args);
}
console.check = function(owner, data, ...args) {
    if (owner) {
        console.owner(data, ...args);
    } else {
        console.info(data, ...args);
    }
}

