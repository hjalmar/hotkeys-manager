class Hotkey{
  constructor({keys, data, groups, options}){
    if(!Array.isArray(keys)){
      throw new Error(`Invalid keys. Expecting array of string representation values.`);
    }
    this.options = {
      ...options
    }
    this.groups = groups || [];
    this.signature = keys.toString();
    this.keys = keys;
    this.data = data;
    // callbacks
    this.__on;
    this.__off;
  }
  get callbacks(){
    return {
      on: this.__on,
      off: this.__off
    };
  }
  on(fn){
    if(typeof fn != 'function'){
      throw new Error(`Invalid 'off' function`);
    }
    this.__on = fn;
    return this;
  }
  off(fn){
    if(typeof fn != 'function'){
      throw new Error(`Invalid 'off' function`);
    }
    this.__off = fn;
    return this;
  }
}

export default class HotkeysManager{
  constructor(target, options){
    this.__options = {
      once: true,
      preventDefault: true,
      ...options
    };
    this.__registeredGroups = new Set();
    this.__enabledGroups = '__all__';
    this.__commands = new Map();
    this.__target = target;
  }
  get target(){
    return this.__target;
  }
  _prepare(arr){
    if(!Array.isArray(arr)){
      throw new Error(`Invalid '_prepare' argument. Expecting array, got : [${typeof arr}]`);
    }
    // sort the keys so they always end up in the same order
    return [...arr].map(key => key.toLowerCase()).sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }
  enableAllGroups(){
    this.__enabledGroups = '__all__';
  }
  enableGroups(...groups){
    return [...this.__enabledGroups = [...groups]];
  }
  _find(command){
    // get all command values
    const commands = Array.from(this.__commands.values());
    // sort after priority
    commands.sort((a, b) => b.options.priority - a.options.priority);

    // filter all commands that includes any route
    let found;
    if(Array.isArray(this.__enabledGroups)){
      found = commands.find(KeyboardShortcut => {
        return KeyboardShortcut.groups.some(g => {
          // find a match which matches groups and signature
          if(!this.__enabledGroups || this.__enabledGroups.includes(g)){
            if(KeyboardShortcut.signature == command.toString()){
              return true;
            }
          }
        });
      });
    // check if we have the __all__ wildcard and to simply look through every single command
    }else if(this.__enabledGroups == '__all__'){
      found = commands.find(KeyboardShortcut => KeyboardShortcut.signature == command.toString());
    }

    return found;
  }
  set(keySequence, { data, groups, ...props }){
    // check to see if groups is an array and has a size of at least 1
    // else return an array with one item which is the '*' wildcard
    // this will register one global entry
    groups = Array.isArray(groups) && groups.length > 0 ? groups : ['*'];
    // track all registered groups
    groups.map(group => this.__registeredGroups.add(group));
    const keys = this._prepare(keySequence);
    const shortcut = new Hotkey({
      keys, 
      data, 
      groups,
      options: { 
        priority: props.priority || 0,
        once: props.once || this.__options.once, 
        preventDefault: props.preventDefault || this.__options.preventDefault,
      }
    });

    // iterate over all groups and store a reference 
    groups.map(group => {
      if(this.__commands.get(`${group},${shortcut.signature}`)){
        throw new Error(`Shortcut already defined : [${group},${shortcut.signature}]`);
      }
      this.__commands.set(`${group},${shortcut.signature}`, shortcut);
    });

    return shortcut;
  }
  execute(command, state){
    // loop through command sequence and dispatch the events
    // which will execute the command like one pressed the keyboard
    // handle on state
    if(state == 'on' || state == undefined){
      const keys = {};
      command.map(key => keys[key.toLowerCase()] = true);
      const e = new Event("keydown");
      e.customExecuteEvent = keys;
      this.__target.dispatchEvent(e);
    }

    // handle off state
    if(state == 'off' || state == undefined){
      // release them
      command.map(key => {
        const e = new Event("keyup");
        e.code = key;
        this.__target.dispatchEvent(e);
      });
    }
  }
  subscribe(callback){
    let keys = {};
    let prevCommand = {};
    const keyDownHandler = (e) => {
      if(e.customExecuteEvent){
        keys = e.customExecuteEvent;
      }else{
        keys[e.code.toLowerCase()] = true;
      }
      // get all active keys
      const currentCommand = this._prepare(Object.entries(keys).filter(([k, v]) => v).map(([k, v]) => k.toLowerCase()));
      // store the previous command
      const match = this._find(currentCommand);
      // if we have a match go ahead and trigger the callback
      if(match){
        if(match.options.preventDefault){
          e.preventDefault();
        }
        // prevent command from executing over and over again if the option 'once' is defined
        if(match.options.once && currentCommand.toString() == prevCommand.signature){
          return;
        }
        
        // and store the command signature
        prevCommand = {
          instance: match,
          signature: currentCommand.toString()
        };
        // if the shortcut has on callback, execute that as well
        if(typeof match.callbacks.on == 'function'){
          match.callbacks.on.call(null, { e, Hotkey: match, on: true });
        }else{
          // call the callback
          if(typeof callback == 'function'){
            callback.call(null, { e, Hotkey: match, on: true });
          }
        }

      }
    }
    const keyUpHandler = e => {
      keys[e.code.toLowerCase()] = false; 
      if(prevCommand.instance && typeof prevCommand.instance.callbacks.off == 'function'){
        prevCommand.instance.callbacks.off.call(null, { e, Hotkey: prevCommand.instance, on: false });
      }else{
        // call the callback
        if(prevCommand.instance && typeof callback == 'function'){
          callback.call(null, { e, Hotkey: prevCommand.instance, on: false });
        }
      }


      prevCommand = {};
    };
    // 'keydown' since we want to trigger, shift, control, alt etc. 'keypress' does not
    this.__target.addEventListener('keydown', keyDownHandler);
    this.__target.addEventListener('keyup', keyUpHandler);

    // return unsubscribe method which in turn returns another subscribe method
    // to resubscribe with the same options if need be. 
    return () => {
      this.__target.removeEventListener('keyup', keyUpHandler);
      this.__target.removeEventListener('keydown', keyDownHandler);
      return _ => this.subscribe(this.__target, callback);
    }
  }
}