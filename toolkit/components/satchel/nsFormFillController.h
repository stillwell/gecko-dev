/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef __nsFormFillController__
#define __nsFormFillController__

#include "mozilla/TimeStamp.h"
#include "nsIFormFillController.h"
#include "nsIAutoCompleteInput.h"
#include "nsIAutoCompleteSearch.h"
#include "nsIAutoCompleteController.h"
#include "nsIAutoCompletePopup.h"
#include "nsIDOMEventListener.h"
#include "nsCOMPtr.h"
#include "nsStubMutationObserver.h"
#include "nsTHashMap.h"
#include "nsInterfaceHashtable.h"
#include "nsIDocShell.h"
#include "nsIMutationObserver.h"
#include "nsIObserver.h"
#include "nsCycleCollectionParticipant.h"

class nsFormHistory;
class nsINode;

namespace mozilla {
class CancelableRunnable;
class ErrorResult;
namespace dom {
class EventTarget;
class Element;
}  // namespace dom
}  // namespace mozilla

class nsFormFillController final : public nsIFormFillController,
                                   public nsIAutoCompleteInput,
                                   public nsIAutoCompleteSearch,
                                   public nsIFormFillCompleteObserver,
                                   public nsIDOMEventListener,
                                   public nsIObserver,
                                   public nsMultiMutationObserver {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_NSIFORMFILLCONTROLLER
  NS_DECL_NSIAUTOCOMPLETESEARCH
  NS_DECL_NSIAUTOCOMPLETEINPUT
  NS_DECL_NSIFORMFILLCOMPLETEOBSERVER
  NS_DECL_NSIDOMEVENTLISTENER
  NS_DECL_NSIOBSERVER
  NS_DECL_NSIMUTATIONOBSERVER

  NS_DECL_CYCLE_COLLECTION_CLASS_AMBIGUOUS(nsFormFillController,
                                           nsIFormFillController)

  MOZ_CAN_RUN_SCRIPT nsresult Focus(mozilla::dom::Event* aEvent);
  MOZ_CAN_RUN_SCRIPT nsresult KeyDown(mozilla::dom::Event* aKeyEvent);
  MOZ_CAN_RUN_SCRIPT nsresult MouseDown(mozilla::dom::Event* aMouseEvent);

  nsFormFillController();

  static already_AddRefed<nsFormFillController> GetSingleton();

 protected:
  MOZ_CAN_RUN_SCRIPT virtual ~nsFormFillController();

  MOZ_CAN_RUN_SCRIPT
  void StartControllingInput(mozilla::dom::Element* aInput);
  MOZ_CAN_RUN_SCRIPT void StopControllingInput();

  bool IsFocusedInputControlled() const;

  MOZ_CAN_RUN_SCRIPT
  nsresult HandleFocus(mozilla::dom::Element* aInput);

  void AttachListeners(mozilla::dom::EventTarget* aEventTarget);

  /**
   * Checks that aElement is a type of element we want to fill, then calls
   * StartControllingInput on it.
   */
  MOZ_CAN_RUN_SCRIPT
  void MaybeStartControllingInput(mozilla::dom::Element* aElement);

  // clears the reference mRestartAfterAttributeChangeTask before running
  // MaybeStartControllingInput()
  MOZ_CAN_RUN_SCRIPT
  void MaybeStartControllingInputScheduled(mozilla::dom::Element* aElement);

  // cancels a scheduled AttributeChangeTask and clears the reference
  // mRestartAfterAttributeChangeTask
  MOZ_CAN_RUN_SCRIPT
  void MaybeCancelAttributeChangeTask();

  void MaybeObserveDataListMutations();

  MOZ_CAN_RUN_SCRIPT void RevalidateDataList();
  bool RowMatch(nsFormHistory* aHistory, uint32_t aIndex,
                const nsAString& aInputName, const nsAString& aInputValue);

  inline nsIDocShell* GetDocShellForInput(mozilla::dom::Element* aInput);

  void MaybeRemoveMutationObserver(nsINode* aNode);

  void RemoveForDocument(mozilla::dom::Document* aDoc);

  bool IsTextControl(nsINode* aNode);

  // members //////////////////////////////////////////

  nsCOMPtr<nsIAutoCompleteController> mController;
  mozilla::dom::Element* mFocusedElement;
  RefPtr<mozilla::CancelableRunnable> mRestartAfterAttributeChangeTask;

  // mListNode is a <datalist> element which, is set, has the form fill
  // controller as a mutation observer for it.
  nsINode* mListNode;
  nsCOMPtr<nsIAutoCompletePopup> mFocusedPopup;

  // The observer passed to StartSearch. It will be notified when the search
  // is complete or the data from a datalist changes.
  nsCOMPtr<nsIAutoCompleteObserver> mLastListener;

  // This is cleared by StopSearch().
  nsString mLastSearchString;

  nsTHashMap<nsPtrHashKey<const nsINode>, bool> mAutoCompleteInputs;

  uint16_t mFocusAfterRightClickThreshold;
  uint32_t mTimeout;
  uint32_t mMinResultsForPopup;
  uint32_t mMaxRows;
  mozilla::TimeStamp mLastRightClickTimeStamp;
  bool mDisableAutoComplete;
  bool mCompleteDefaultIndex;
  bool mCompleteSelectedIndex;
  bool mForceComplete;
  bool mSuppressOnInput;
  bool mPasswordPopupAutomaticallyOpened;
  bool mAutoCompleteActive = false;
  bool mInvalidatePreviousResult = false;

 private:
  void GetName(mozilla::dom::Element* aInput, nsAString& aValue);
  void GetValue(mozilla::dom::Element* aInput, nsAString& aValue);
  mozilla::dom::Element* GetList(mozilla::dom::Element* aInput);
  bool HasBeenTypePassword(mozilla::dom::Element* aInput);
  bool ReadOnly(mozilla::dom::Element* aInput) const;
  uint32_t GetSelectionStartInternal(mozilla::dom::Element* aInput,
                                     mozilla::ErrorResult& aRv);
  uint32_t GetSelectionEndInternal(mozilla::dom::Element* aInput,
                                   mozilla::ErrorResult& aRv);

  MOZ_CAN_RUN_SCRIPT
  void SetSelectionRange(mozilla::dom::Element* aInput,
                         uint32_t aSelectionStart, uint32_t aSelectionEnd,
                         mozilla::ErrorResult& aRv);
  void SetUserInput(mozilla::dom::Element* aInput, const nsAString& aValue,
                    nsIPrincipal& aSubjectPrincipal);
  void EnablePreview(mozilla::dom::Element* aInput);
};

#endif  // __nsFormFillController__
