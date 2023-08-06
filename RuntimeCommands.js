const readline = require('readline');
const path = require('path');
const fs = require('fs');



class RuntimeCommands {

  constructor() {
    this.flag;
  }



  /**
   * Listen for the runtime commands
   */
  listen() {

    // readline
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', async (line) => {
      line = line.replace(/\s+/g, ' ').trim();

      if (line === '') {
        // console.log('');
      } else if (line === 'p') {
        console.log(':paused\n');
        this._pause();
      } else if (line === 'r') {
        console.log(':resumed\n');
        this._resume();
      } else if (line === 's') {
        console.log(':stoped\n');
        this._stop();
      } else if (line === 'k') {
        console.log(':killed\n');
        this._kill();


      } else if (line === 'i') {
        this._showInput();

      } else if (/input/i.test(line) && /\.json/i.test(line)) {
        console.log(':input loaded\n');
        this._loadInput(line);


      } else if (line === 'x') {
        console.log(':show x');
        this._showX();

      } else if (/^x.*\=/.test(line)) {
        console.log(':set x field');
        this._setupXfield(line);

      } else if (/^delete x.*/.test(line)) {
        console.log(':delete x field');
        this._deleteXfield(line);


      } else if (line === 'e') {
        console.log(':eval');
        rl.prompt(); // show > prompt
        this.flag = 'eval';
      } else if (this.flag === 'eval') {
        this._evaluate(line); // > console.log('my test');
        this.flag = undefined; // reset flag

      } else if (line === 'f') {
        console.log(':func');
        rl.prompt(); // show > prompt
        this.flag = 'func';
      } else if (this.flag === 'func') {
        this._exeFunction(line); // > console.log(lib);
        this.flag = undefined; // reset flag


      } else {
        // press command s (stop) then r (resume)
        console.log(`:serial task(s) execution\n`);
        this.start();
        await this._exeSerial(line); // line: 'openLoginPage, login'
        this.stop();
      }

    });
  }




  /************ PRIVATES *********/
  /**
   * Pause Functionflow functions.
   * Notice: currently running function will finish completely and next function will be paused.
   */
  _pause() {
    try {
      this.pause();
    } catch (err) {
      console.log(err.message);
    }
  }

  /**
   * Resume paused Functionflow function.
   */
  _resume() {
    try {
      this.start();
    } catch (err) {
      console.log(err.message);
    }
  }

  /**
   * Stop Functionflow function.
   */
  _stop() {
    try {
      this.stop();
    } catch (err) {
      console.log(err.message);
    }
  }

  /**
   * Kill the NodeJS process.
   */
  _kill() {
    process.exit(1);
  }



  /**
   * Reload the input JSON file. Input must be injected into the ff.lib -> ff.LibAdd({input});
   * @param {String} inputFile - myInput2.json
   */
  _loadInput(inputFile) {
    try {
      const inputFile_path = path.join(process.cwd(), inputFile);
      delete require.cache[inputFile_path]; // IMPORTANT!!! Delete npm cache because we want to have fresh file data
      this.lib.input = require(inputFile_path);
      console.log(this.lib.input);
    } catch (err) {
      console.log(err.message);
    }
  }

  /**
   * Show the input JSON file. Input must be injected into the ff.lib -> ff.LibAdd({input});
   */
  _showInput() {
    try {
      console.log(this.lib.input);
    } catch (err) {
      console.log(err.message);
    }
  }



  /**
   * Show the "x" a transitional variable.
   */
  _showX() {
    try {
      console.log(this.x);
    } catch (err) {
      console.log(err.message);
    }
  }


  /**
   * Setup "x.field" value.
   * For example: x.product.name = ' Red car ' or x.product.name = " Red car"
   */
  _setupXfield(line) {
    try {
      const matched = line.match(/(.*)\s*=\s*(.*)/);

      // get property name
      const prop = matched[1].trim(); // x.product.name

      // get value
      let val = matched[2].trim(); // ' Red car '
      val = val.replace(/^\'/, '').replace(/\'$/, ''); // remove single quote '
      val = val.replace(/^\"/, '').replace(/\"$/, ''); // remove double quote "
      val = this._typeConvertor(val);

      const propSplitted = prop.split('.'); // ['x', 'product', 'name']
      let i = 1;
      let obj = this;
      for (const prop of propSplitted) {
        if (i !== propSplitted.length) { // not last property
          obj[prop] = this[prop];
          obj = obj[prop];
        } else { // on last property associate the value
          obj[prop] = val;
        }
        i++;
      }

      console.log(`new value:: ${prop} = ${JSON.stringify(val, null, 2)}`);

    } catch (err) {
      console.log(err.message);
    }
  }



  /**
   * Delete "x.field" value.
   * For example: delete x.product.name
   */
  _deleteXfield(line) {
    try {
      const prop = line.replace('delete', '').trim(); // x.product.name
      const propSplitted = prop.split('.'); // ['x', 'product', 'name']

      let i = 1;
      let obj = this;
      for (const prop of propSplitted) {
        if (i !== propSplitted.length) { // not last property
          obj[prop] = this[prop];
          obj = obj[prop];
        } else { // on last property delete the field
          delete obj[prop];
        }
        i++;
      }
      console.log(`The field ${prop} is deleted.`);
    } catch (err) {
      console.log(err.message);
    }
  }


  /**
   * Convert string into integer, float or boolean.
   * @param {string} value
   * @returns {string | number | boolean | object}
   */
  _typeConvertor(value) {
    // JSON string - {"a": 3, "b":"B"}
    function isJSON(str) {
      try { JSON.parse(str); }
      catch (err) { return false; }
      return true;
    }

    // JS object notation string - JSON string - {a: 3, b:'B'}
    function hasObjectNotation(value) {
      return /^\{.+\}$/.test(value);
    }

    if (!!value && !isNaN(value) && !/\./.test(value)) { // convert string into integer (12)
      value = parseInt(value, 10);
    } else if (!!value && !isNaN(value) && /\./.test(value)) { // convert string into float (12.35)
      value = parseFloat(value);
    } else if (value === 'true' || value === 'false') { // convert string into boolean (true)
      value = JSON.parse(value);
    } else if (isJSON(value)) {
      value = JSON.parse(value);
    } else if (hasObjectNotation(value)) {
      console.log(JSON.stringify(value));
      value = eval(`(${value})`);
    } else if (value === 'undefined') {
      value = undefined;
    } else if (value === 'null') {
      value = null;
    }

    return value;
  }



  /**
    * Execute functions serially. Stop the task before using this command (s).
    * @param {String} files - 'login.js, extractData.js'
    */
  async _exeSerial(files) {

    const files_arr = files.split(',');

    try {

      const funcs = [];

      for (let f of files_arr) {

        f = f.trim();
        let file_path = path.join(process.cwd(), f);
        if (!/\.js/.test(f)) { file_path += '.js'; } // add .js extension

        const tf = fs.existsSync(path)(file_path); // check if file exists

        let func;
        if (tf) {
          delete require.cache[file_path]; // IMPORTANT!!! Delete npm cache because we want to have fresh file data
          func = require(file_path);
          funcs.push(func);
        } else {
          throw new Error(`Function NOT FOUND: ${file_path}`);
        }

      }

      await this.serial(funcs);

    } catch (err) {
      console.log(err.message);
    }
  }



  /**
   * Evaluate JS code. Simmilar to $node command.
   * @param {String} code - JS code
   */
  _evaluate(code) {
    try {
      eval(code);
    } catch (err) {
      console.log(err.message);
    }
  }



  /**
   * Execute FunctionFlow function code with x, lib parameters.
   * @param {String} ff_code - JS code for functionflow function (x, lib) => { ...ff_code... }
   */
  async _exeFunction(ff_code) {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
      const func = new AsyncFunction('x', 'lib', ff_code);
      await this.one(func);
    } catch (err) {
      console.log(err.message);
    }
  }




}


module.exports = RuntimeCommands;
