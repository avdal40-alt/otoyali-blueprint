import "server-only";

export type DealerLiveTransportSession = {
  providerKey: string;
  providerStreamRef: string;
};

export interface DealerLiveTransportAdapter {
  provision(input: { streamId: string }): Promise<DealerLiveTransportSession>;
}

/**
 * Local-only adapter used by contract tests and development. It neither calls
 * a streaming provider nor turns Supabase/Vercel into video transport.
 */
export function createLocalFakeDealerLiveTransport(): DealerLiveTransportAdapter {
  return {
    async provision({ streamId }) {
      return { providerKey: "local_fake", providerStreamRef: `local:${streamId}` };
    }
  };
}
