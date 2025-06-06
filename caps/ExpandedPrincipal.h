/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ExpandedPrincipal_h
#define ExpandedPrincipal_h

#include "nsCOMPtr.h"
#include "nsJSPrincipals.h"
#include "nsProxyRelease.h"
#include "nsTArray.h"
#include "nsNetUtil.h"
#include "mozilla/BasePrincipal.h"

class nsIContentSecurityPolicy;

namespace mozilla {
class JSONWriter;
}  // namespace mozilla

class ExpandedPrincipal : public nsIExpandedPrincipal,
                          public mozilla::BasePrincipal {
 public:
  static already_AddRefed<ExpandedPrincipal> Create(
      const nsTArray<nsCOMPtr<nsIPrincipal>>& aAllowList,
      const mozilla::OriginAttributes& aAttrs);

  static PrincipalKind Kind() { return eExpandedPrincipal; }

  NS_DECL_NSIEXPANDEDPRINCIPAL

  NS_IMETHOD_(MozExternalRefCountType) AddRef() override {
    return nsJSPrincipals::AddRef();
  };
  NS_IMETHOD_(MozExternalRefCountType) Release() override {
    return nsJSPrincipals::Release();
  };
  NS_IMETHOD QueryInterface(REFNSIID aIID, void** aInstancePtr) override;
  NS_IMETHOD GetURI(nsIURI** aURI) override;
  NS_IMETHOD GetDomain(nsIURI** aDomain) override;
  NS_IMETHOD SetDomain(nsIURI* aDomain) override;
  NS_IMETHOD GetBaseDomain(nsACString& aBaseDomain) override;
  NS_IMETHOD GetAddonId(nsAString& aAddonId) override;
  NS_IMETHOD IsThirdPartyURI(nsIURI* uri, bool* aRes) override;
  virtual bool AddonHasPermission(const nsAtom* aPerm) override;
  virtual nsresult GetScriptLocation(nsACString& aStr) override;

  bool AddonAllowsLoad(nsIURI* aURI, bool aExplicit = false);

  void SetCsp(nsIContentSecurityPolicy* aCSP);

  // Returns the principal to inherit when this principal requests the given
  // URL. See BasePrincipal::PrincipalToInherit.
  nsIPrincipal* PrincipalToInherit(nsIURI* aRequestedURI = nullptr);

  nsresult GetSiteIdentifier(mozilla::SiteIdentifier& aSite) override;

  virtual nsresult WriteJSONInnerProperties(
      mozilla::JSONWriter& aWriter) override;

  // Serializable keys are the valid enum fields the serialization supports
  enum SerializableKeys : uint8_t { eSpecs = 0, eSuffix, eMax = eSuffix };

  static constexpr char SpecsKey = '0';
  static_assert(eSpecs == 0);
  static constexpr char SuffixKey = '1';
  static_assert(eSuffix == 1);

  class Deserializer : public BasePrincipal::Deserializer {
   public:
    NS_IMETHOD Read(nsIObjectInputStream* aStream) override;
  };

 protected:
  explicit ExpandedPrincipal(nsTArray<nsCOMPtr<nsIPrincipal>>&& aPrincipals,
                             const nsACString& aOriginNoSuffix,
                             const mozilla::OriginAttributes& aAttrs);

  virtual ~ExpandedPrincipal();

  bool SubsumesInternal(nsIPrincipal* aOther,
                        DocumentDomainConsideration aConsideration) override;

  bool MayLoadInternal(nsIURI* aURI) override;

 private:
  const nsTArray<nsCOMPtr<nsIPrincipal>> mPrincipals;
  nsMainThreadPtrHandle<nsIContentSecurityPolicy> mCSP
      MOZ_GUARDED_BY(mozilla::sMainThreadCapability);
};

#define NS_EXPANDEDPRINCIPAL_CID \
  {0xe8ee88b0, 0x5571, 0x4086, {0xa4, 0x5b, 0x39, 0xa7, 0x16, 0x90, 0x6b, 0xdb}}

#endif  // ExpandedPrincipal_h
