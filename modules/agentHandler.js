const chalk = require('chalk');
const co = require('co');
const fs = require('fs');

handler = (function(){

  /*
  CHALK LOCAL VARIABLES
  */
  const chalk_error = chalk.bold.red;
  const chalk_state = chalk.yellow;
  const chalk_info = chalk.blue;
  const chalk_infoAlternative = chalk.gray;
  const chalk_data = chalk.green;
  const chalk_dataAlternative = chalk.cyan;

  /*
  LOCAL VARIABLES
  */
  let enumeratedClasses = {}
  let classes_that_match_filter = []
  let newClassesToHook = [];
  let enumerateOnly = false;
  let classFilter;
  let agent_api = {};

  /*
  LOCAL FUNCTIONS
  */

  function handleEnumerateClasses(class_name){
    if(!enumeratedClasses[class_name]){
      enumeratedClasses[class_name] = true; // object for searching
      if (classFilter.test(class_name)){
        classes_that_match_filter.push(class_name); // array for dumping to discovered classes file
        newClassesToHook.push(class_name); // new classes discovered that need to be hooked when enumerate classes is finished
      }

    }
  }

  function handleEnumerateClassesDone(){
    let message =  " Finished enumerating classes: discovered " + newClassesToHook.length + " classes";
    console.log("\n" + chalk_state(message));
    /*if new classes to be hooked are discovered, and the user is performing tracing*/
    if(newClassesToHook.length > 0 && !enumerateOnly){
      // co(function *() {
      //   yield agent_api.providedClassesHook(newClassesToHook);
      // });
      agent_api.providedClassesHook(newClassesToHook);
    }
    newClassesToHook = []; // clear newClassesToHook after the classes have been hooked
    outputClassesToFile();
  }

  function outputClassesToFile(){
    fs.writeFile('./classes.json', JSON.stringify(classes_that_match_filter),
      function (err) {
          if (err) {
              console.error(err);
          }
      }
    );
  }

  function filterClasses(classes){
    let classes_to_hook = classes.filter(
      function(class_name){
        return classFilter.test(class_name)
      }
    );
    return classes_to_hook;
  }

  function printLineBreak(){
    console.log(" --------------------------------------------------------------");
  }

  /*
  PUBLIC FUNCTIONS
  */

  function setAgentApi(api){
    agent_api = api;
  }

  function setClassFilter(filterVal){
    classFilter = new RegExp(filterVal);
  }

  function setEnumerateOnly() {
    enumerateOnly = true;
  }

  function printStateInformation(message){
    if (message.type === "info") {
      console.log("\n " + chalk_state(message.data));
    }
  }

  function traceClassesFromFile(file){
    fs.readFile(file, 'utf8', function (err, data) {
      if (err)
        throw err;
      let classes_from_file = JSON.parse(data);
      classes_to_hook = filterClasses(classes_from_file);
      agent_api.providedClassesHook(classes_to_hook);
    });
  }  

  function agentMessageHandler(message){
    if ("undefined" !== typeof message.payload){
      switch(message.payload.type) {
        case "enumerateClasses":
          handleEnumerateClasses(message.payload.data);
          break;
        case "enumerateClassesDone":
          handleEnumerateClassesDone();
          break;
        case "methodCalled":
          printLineBreak();
          console.log(chalk_data(" CLASS ") + message.payload.data.className);
          console.log(chalk_data(" " + message.payload.data.methodType)+ " " + message.payload.data.methodName);
          // console.log(chalk_data(" ARGUMENT TYPES: ") + message.payload.data.argTypes);
          console.log(chalk_data(" ARGUMENTS: ") + message.payload.data.args);
          console.log(chalk_data(" RETURN: ") + message.payload.data.ret);
          break;
        case "constructorCalled":
          printLineBreak();
          console.log(chalk_dataAlternative(" CONSTRUCTOR ") + message.payload.data.className);
          console.log(chalk_dataAlternative(" ARGUMENT TYPES: ") + message.payload.data.argTypes);
          console.log(chalk_dataAlternative(" ARGUMENTS: ") + message.payload.data.args);
          break;
        case "constructorHooked":
          printLineBreak();
          console.log(chalk_info(" CONSTRUCTOR ") + message.payload.data.className);
          console.log(chalk_info(" ARGUMENT TYPES: ") + message.payload.data.args);
          break;
        case "methodHooked":
          printLineBreak();
          console.log(chalk_info(" CLASS ") + message.payload.data.className);
          console.log(chalk_info(" " + message.payload.data.methodType)+ " " + message.payload.data.methodName);
          console.log(chalk_info(" ARGUMENT TYPES: ") + message.payload.data.args);
          break;
        case "errorHook":
          printLineBreak();
          console.log(chalk_error(" CLASS ") + message.payload.data.className);
          console.log(chalk_error(" " + message.payload.data.methodType)+ " " + message.payload.data.methodName);
          console.log(chalk_error(" ARGUMENT TYPES: ") + message.payload.data.args);
          break;
        case "info":
          printLineBreak();
          console.log("\n " + chalk_state(message.payload.data));
          break;
        case "errorGeneric":
        printLineBreak();
          console.log("\n " + chalk_state(message.payload.data));
          break;
      }
    }
  }

  /*
  RETURN OBJECTS
  */

  return {
    agentMessageHandler: agentMessageHandler,
    printStateInformation: printStateInformation,
    setAgentApi: setAgentApi,
    setClassFilter: setClassFilter,
    setEnumerateOnly: setEnumerateOnly,
    traceClassesFromFile: traceClassesFromFile
  }

})()

module.exports = {
  handler: handler
}
