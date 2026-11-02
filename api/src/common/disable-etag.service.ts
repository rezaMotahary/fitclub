import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

/** Stop Express from sending ETag on private API responses (a cache can replay them with 304). */
@Injectable()
export class DisableEtagService implements OnApplicationBootstrap {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  onApplicationBootstrap(): void {
    const adapter = this.adapterHost.httpAdapter;
    if (adapter.getType() !== 'express') return;
    adapter.getInstance().set('etag', false);
  }
}
