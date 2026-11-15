import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { CeoVerificationSettings } from '../types.js';
import {
  CEO_VERIFIED_BADGE_TEXT,
  getCachedVerificationConfig,
  subscribeToCeoVerificationSettings,
  subscribeToCeoVerifiedRegistry
} from '../services/ceoAdmin.js';

// Singleton shared listeners across all mounted cards & modals
let sharedConfig: CeoVerificationSettings = getCachedVerificationConfig();
let configUnsub: (() => void) | null = null;
const configListeners = new Set<(cfg: CeoVerificationSettings) => void>();

let sharedVerifiedIds = new Set<string>();
let registryUnsub: (() => void) | null = null;
const registryListeners = new Set<(ids: Set<string>) => void>();

export function useCeoVerificationConfig(): CeoVerificationSettings {
  const [config, setConfig] = useState<CeoVerificationSettings>(sharedConfig);

  useEffect(() => {
    configListeners.add(setConfig);
    setConfig(sharedConfig);
    if (!configUnsub) {
      configUnsub = subscribeToCeoVerificationSettings((nextCfg) => {
        sharedConfig = nextCfg;
        configListeners.forEach((cb) => cb(nextCfg));
      });
    }
    return () => {
      configListeners.delete(setConfig);
      if (configListeners.size === 0 && configUnsub) {
        configUnsub();
        configUnsub = null;
      }
    };
  }, []);

  return config;
}

export function useIsEntityCeoVerified(
  entityIds: Array<string | undefined | null>,
  explicitVerified?: boolean
): boolean {
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(sharedVerifiedIds);

  useEffect(() => {
    registryListeners.add(setVerifiedSet);
    setVerifiedSet(sharedVerifiedIds);
    if (!registryUnsub) {
      registryUnsub = subscribeToCeoVerifiedRegistry((nextSet) => {
        sharedVerifiedIds = nextSet;
        registryListeners.forEach((cb) => cb(nextSet));
      });
    }
    return () => {
      registryListeners.delete(setVerifiedSet);
      if (registryListeners.size === 0 && registryUnsub) {
        registryUnsub();
        registryUnsub = null;
      }
    };
  }, []);

  if (explicitVerified) return true;
  for (const id of entityIds) {
    if (id && verifiedSet.has(id)) return true;
  }
  return false;
}

interface CeoVerifiedBadgeProps {
  verified?: boolean;
  entityIds?: Array<string | undefined | null>;
  customText?: string;
  variant?: 'compact' | 'pill' | 'banner';
  className?: string;
}

export const CeoVerifiedBadge: React.FC<CeoVerifiedBadgeProps> = ({
  verified = false,
  entityIds = [],
  customText,
  variant = 'pill',
  className = ''
}) => {
  const isVerified = useIsEntityCeoVerified(entityIds, verified);
  const config = useCeoVerificationConfig();

  if (!isVerified) return null;

  const badgeText = customText || config.badgeText || CEO_VERIFIED_BADGE_TEXT;

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#0B6B3A] text-[9px] font-black tracking-wide uppercase shadow-xs ${className}`}
        title={badgeText}
      >
        {config.logoUrl ? (
          <img
            src={config.logoUrl}
            alt="FU MARKET CEO Verification"
            className="w-3.5 h-3.5 rounded-full object-cover border border-emerald-300 bg-white shrink-0"
          />
        ) : (
          <ShieldCheck className="w-3 h-3 text-[#0B6B3A] shrink-0" />
        )}
        <span className="truncate max-w-[165px]">{badgeText}</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#0B6B3A]/10 via-emerald-50 to-amber-50/70 border border-emerald-200 shadow-xs ${className}`}
      >
        {config.logoUrl ? (
          <img
            src={config.logoUrl}
            alt="Official CEO Verification Seal"
            className="w-7 h-7 rounded-full object-cover border-2 border-[#0B6B3A] bg-white shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#0B6B3A] text-[#F2B90D] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-black tracking-wider text-[#0B6B3A] uppercase leading-tight flex items-center gap-1">
            <span>{badgeText}</span>
          </div>
          <p className="text-[10px] text-emerald-800/80 font-medium truncate">
            Officially reviewed and verified on FU MARKET
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#0B6B3A] text-[10px] font-black tracking-wide uppercase shadow-xs ${className}`}
      title={badgeText}
    >
      {config.logoUrl ? (
        <img
          src={config.logoUrl}
          alt="FU MARKET CEO Verification"
          className="w-4 h-4 rounded-full object-cover border border-emerald-300 bg-white shrink-0"
        />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5 text-[#0B6B3A] shrink-0" />
      )}
      <span>{badgeText}</span>
    </span>
  );
};
