const { TextEncoder, TextDecoder } = require('util');
global.setImmediate = global.setImmediate || ((fn) => setTimeout(fn, 0));
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;