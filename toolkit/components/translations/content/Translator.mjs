/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @typedef {typeof import("../translations")} Translations
 */

/**
 * @typedef {import("../translations").LanguagePair} LanguagePair
 * @typedef {import("../translations").RequestTranslationsPort} RequestTranslationsPort
 */

/**
 * This class manages the communications to the translations engine via MessagePort.
 */
export class Translator {
  /**
   * The port through with to communicate with the Translations Engine.
   *
   * @type {MessagePort}
   */
  #port;

  /**
   * True if the current #port is closed, otherwise false.
   *
   * @type {boolean}
   */
  #portClosed = true;

  /**
   * A promise that resolves when the Translator has successfully established communication with
   * the translations engine, or rejects if communication was not successfully established.
   *
   * @type {Promise<void>}
   */
  #ready = Promise.reject;

  /**
   * The current language pair to use for translation.
   *
   * @type {LanguagePair}
   */
  #languagePair;

  /**
   * The callback function to request a new port, provided at construction time
   * by the caller.
   *
   * @type {RequestTranslationsPort}
   */
  #requestTranslationsPort;

  /**
   * An id for each message sent. This is used to match up the request and response.
   *
   * @type {number}
   */
  #nextTranslationId = 0;

  /**
   * Tie together a message id to a resolved response.
   *
   * @type {Map<number, TranslationRequest>}
   */
  #requests = new Map();

  /**
   * Initializes a new Translator.
   *
   * Prefer using the Translator.create() function.
   *
   * @see Translator.create
   *
   * @param {LanguagePair} languagePair
   * @param {RequestTranslationsPort} requestTranslationsPort - A callback function to request a new MessagePort.
   */
  constructor(languagePair, requestTranslationsPort) {
    this.#languagePair = languagePair;
    this.#requestTranslationsPort = requestTranslationsPort;
  }

  /**
   * @returns {Promise<void>} A promise that indicates if the Translator is ready to translate.
   */
  get ready() {
    return this.#ready;
  }

  /**
   * @returns {boolean} True if the translation port is closed, false otherwise.
   */
  get portClosed() {
    return this.#portClosed;
  }

  /**
   * Opens up a port and creates a new translator.
   *
   * @param {LanguagePair} languagePair
   * @param {RequestTranslationsPort} [requestTranslationsPort]
   *  - A function to request a translations port for communication with the Translations engine.
   *    This is required in all cases except if allowSameLanguage is true and the sourceLanguage
   *    is the same as the targetLanguage.
   * @param {boolean} [allowSameLanguage]
   *  - Whether to allow or disallow the creation of a PassthroughTranslator in the event
   *    that the sourceLanguage and the targetLanguage are the same language.
   *
   * @returns {Promise<Translator | PassthroughTranslator>}
   */
  static async create(
    languagePair,
    requestTranslationsPort,
    allowSameLanguage
  ) {
    if (languagePair.sourceLanguage === languagePair.targetLanguage) {
      if (!allowSameLanguage) {
        throw new Error("Attempt to create disallowed PassthroughTranslator");
      }
      return new PassthroughTranslator(languagePair);
    }

    if (!requestTranslationsPort) {
      throw new Error(
        "Attempt to create Translator without a requestTranslationsPort function"
      );
    }

    const translator = new Translator(languagePair, requestTranslationsPort);
    await translator.#createNewPortIfClosed();

    return translator;
  }

  /**
   * Creates a new translation port if the current one is closed.
   *
   * @returns {Promise<void>} - Whether the Translator is ready to translate.
   */
  async #createNewPortIfClosed() {
    if (!this.#portClosed) {
      return;
    }

    this.#port = await this.#requestTranslationsPort(this.#languagePair);
    this.#portClosed = false;

    // Create a promise that will be resolved when the engine is ready.
    const { promise, resolve, reject } = Promise.withResolvers();

    // Match up a response on the port to message that was sent.
    this.#port.onmessage = ({ data }) => {
      switch (data.type) {
        case "TranslationsPort:TranslationResponse": {
          const { targetText, translationId } = data;
          // A request may not match match a translationId if there is a race during the pausing
          // and discarding of the queue.
          this.#requests.get(translationId)?.resolve(targetText);
          break;
        }
        case "TranslationsPort:GetEngineStatusResponse": {
          if (data.status === "ready") {
            resolve();
          } else {
            this.#portClosed = true;
            reject(new Error(data.error));
          }
          break;
        }
        case "TranslationsPort:EngineTerminated": {
          this.#portClosed = true;
          break;
        }
        default:
          break;
      }
    };

    this.#ready = promise;
    this.#port.postMessage({ type: "TranslationsPort:GetEngineStatusRequest" });
  }

  /**
   * Send a request to translate text to the Translations Engine. If it returns `null`
   * then the request is stale. A rejection means there was an error in the translation.
   * This request may be queued.
   *
   * @param {string} sourceText
   * @returns {Promise<string>}
   */
  async translate(sourceText, isHTML = false) {
    await this.#createNewPortIfClosed();
    await this.#ready;

    const { promise, resolve, reject } = Promise.withResolvers();
    const translationId = this.#nextTranslationId++;

    // Store the "resolve" for the promise. It will be matched back up with the
    // `translationId` in #handlePortMessage.
    this.#requests.set(translationId, {
      sourceText,
      isHTML,
      resolve,
      reject,
    });
    this.#port.postMessage({
      type: "TranslationsPort:TranslationRequest",
      translationId,
      sourceText,
      isHTML,
    });

    return promise;
  }

  /**
   * Close the port and remove any pending or queued requests.
   */
  destroy() {
    this.#port.close();
    this.#portClosed = true;
    this.#ready = Promise.reject;
  }
}

/**
 * The PassthroughTranslator class mimics the same API as the Translator class,
 * but it does not create any message ports for actual translation. This class
 * may only be constructed with the same sourceLanguage and targetLanguage value, and
 * instead of translating, it just passes through the source text as the translated
 * text.
 *
 * The Translator class may return a PassthroughTranslator instance if the sourceLanguage
 * and targetLanguage passed to the create() method are the same.
 *
 * @see Translator.create
 */
class PassthroughTranslator {
  /**
   * The BCP-47 language tag for the source and target language..
   *
   * @type {string}
   */
  #language;

  /**
   * @returns {Promise<void>} A promise that indicates if the Translator is ready to translate.
   */
  get ready() {
    return Promise.resolve;
  }

  /**
   * @returns {boolean} Always false for PassthroughTranslator because there is no port.
   */
  get portClosed() {
    return false;
  }

  /**
   * @returns {string} The BCP-47 language tag of the source language.
   */
  get sourceLanguage() {
    return this.#language;
  }

  /**
   * @returns {string} The BCP-47 language tag of the source language.
   */
  get targetLanguage() {
    return this.#language;
  }

  /**
   * Initializes a new PassthroughTranslator.
   *
   * Prefer using the Translator.create() function.
   *
   * @see Translator.create
   *
   * @param {LanguagePair} languagePair
   */
  constructor(languagePair) {
    if (languagePair.sourceLanguage !== languagePair.targetLanguage) {
      throw new Error(
        "Attempt to create PassthroughTranslator with different sourceLanguage and targetLanguage."
      );
    }
    this.#language = languagePair.sourceLanguage;
  }

  /**
   * Passes through the source text as if it was translated.
   *
   * @returns {Promise<string>}
   */
  async translate(sourceText) {
    return Promise.resolve(sourceText);
  }

  /**
   * There is nothing to destroy in the PassthroughTranslator class.
   * This function is implemented to maintain the same API surface as
   * the Translator class.
   *
   * @see Translator
   */
  destroy() {}
}
