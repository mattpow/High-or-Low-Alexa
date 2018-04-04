'use strict';

 var speechOutput;
 var reprompt;
 var welcomeOutput = "Welcome to High or Low. Want to start a game?";
 var welcomeReprompt = "Want to start a new game?";
 var instructions = "I'll thinking of a number between zero and one thousand. Guess a number and I'll tell you if it is higher or lower.";
 var gameInProgress = false;
 var actualNum = 0;
 var guessNumber = 0;
 var currentNumOfTries = 0;
 var numOfGamesPlayed = 0;
 var bestNumOfTries = Number.MAX_Value;
 var maxValue = 100;
// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: title,
            content: output,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    console.log("Responding with " + JSON.stringify(speechletResponse));
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}

function buildSpeechletResponseWithDirectiveNoIntent() {
    console.log("in buildSpeechletResponseWithDirectiveNoIntent");
    return {
      "outputSpeech" : null,
      "card" : null,
      "directives" : [ {
        "type" : "Dialog.Delegate"
      } ],
      "reprompt" : null,
      "shouldEndSession" : false
    };
  }

  function buildSpeechletResponseDelegate(shouldEndSession) {
      return {
          outputSpeech:null,
          directives: [
                  {
                      "type": "Dialog.Delegate",
                      "updatedIntent": null
                  }
              ],
         reprompt: null,
          shouldEndSession: shouldEndSession
      };
  }


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    console.log("in welcomeResponse");
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = welcomeOutput;
    const repromptText = welcomeReprompt;
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thanks for playing.';
    const shouldEndSession = true;
    gameInProgress = false;
    callback({}, buildSpeechletResponse("Goodbye!", speechOutput, null, shouldEndSession));
}

function delegateSlotCollection(request, sessionAttributes, callback){
  console.log("in delegateSlotCollection");
  console.log("  current dialogState: "+JSON.stringify(request.dialogState));

    if (request.dialogState === "STARTED") {
      console.log("in started");
      console.log("  current request: "+JSON.stringify(request));
      var updatedIntent=request.intent;
      //optionally pre-fill slots: update the intent object with slot values for which
      //you have defaults, then return Dialog.Delegate with this updated intent
      // in the updatedIntent property
      callback(sessionAttributes,
          buildSpeechletResponseWithDirectiveNoIntent());
    } else if (request.dialogState !== "COMPLETED") {
      console.log("in not completed");
      console.log("  current request: "+JSON.stringify(request));
      // return a Dialog.Delegate directive with no updatedIntent property.
      callback(sessionAttributes,
          buildSpeechletResponseWithDirectiveNoIntent());
    } else {
      console.log("in completed");
      console.log("  current request: "+JSON.stringify(request));
      console.log("  returning: "+ JSON.stringify(request.intent));
      // Dialog is now complete and all required slots should be filled,
      // so call your normal intent handler.
      return request.intent;
    }
}

function isSlotValid(request, slotName){
        var slot = request.intent.slots[slotName];
        //console.log("request = "+JSON.stringify(request)); //uncomment if you want to see the request
        var slotValue;

        //if we have a slot, get the text and store it into speechOutput
        if (slot && slot.value) {
            //we have a value in the slot
            slotValue = slot.value.toLowerCase();
            return slotValue;
        } else {
            //we didn't get a value in the slot.
            return false;
        }
}

// --------------- Events -----------------------

function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(request, session, callback) {
    //console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
    console.log("in launchRequest");
    console.log("  request: "+JSON.stringify(request));
    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(request, session, callback) {
    console.log("in onIntent");
    console.log("  request: "+JSON.stringify(request));
    const intent = request.intent;
    const intentName = request.intent.name;

    if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
        handleSessionEndRequest(callback);
    } else if (!gameInProgress) {
        if (intentName === "startNewGame") {
            startNewGame(request, session, callback);
        } else if (intentName === "AMAZON.HelpIntent") {
            callback({}, buildSpeechletResponse("Help", "In the High or Low game, I'll think of a number between zero and one thousand. Guess a number and I'll tell you if it's higher or lower. Say yes to start the game.", null, false));
        } else if (intentName === "unhandled") {
            callback({}, buildSpeechletResponse("Invalid response", "I didn't get that. Try saying a number", "", false));
        } else {
            callback({}, buildSpeechletResponse("Invalid response", "Sorry I didn't get that. Try saying a number", "", false));
        }
    } else { // IN GAME
        if (intentName === "guessNumber") {
            userGuessedNumber(request, session, callback);
        } else if (intentName === "AMAZON.HelpIntent") {
            callback({}, buildSpeechletResponse("Help", "Guess a number and I'll tell you if it's higher or lower than zero and one thousand", "", false));
        } else if (intentName === "unhandled" || intentName === "startNewGame") {
            callback({}, buildSpeechletResponse("Invalid response", "Try saying a number", "Say a number between zero and " + maxValue, false));
        }
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    gameInProgress = false;
    // Add cleanup logic here
}

function getMissingSlot(request, session, callback) {
    var filledSlots = delegateSlotCollection(request, {}, callback);
}

function startNewGame(request, session, callback) {
    gameInProgress = true;
    actualNum = Math.floor(Math.random() * 1000);
    var speechOutput = "Guess a number between zero and one thousand";
    callback({}, buildSpeechletResponse("Start Game", speechOutput, "", false));
}

function userGuessedNumber(request, session, callback) {
    var speechOutput = "";
    guessNumber = parseInt(request.intent.slots.userNumGuess.value);
    currentNumOfTries += 1;
    if (guessNumber > actualNum) {
        speechOutput += guessNumber + " is too high";
    } else if (guessNumber < actualNum) {
        speechOutput += guessNumber + " is too low";
    } else if (guessNumber == actualNum) {
        speechOutput = guessNumber + " is right! You found it in " + currentNumOfTries + " guesses. ";
        if (currentNumOfTries < bestNumOfTries) {
            bestNumOfTries = currentNumOfTries;
            speechOutput += "That's a new high score!";
        }
        speechOutput += " Want to play agaim?";
        gameInProgress = false;
    } else {
        speechOutput = "Try saying a number.";
    }
    callback({}, buildSpeechletResponse("Guessed Number", speechOutput, "", false));
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log("EVENT=====" + JSON.stringify(event));

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
