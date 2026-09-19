import type { Node } from '../../domain/node/Node.d.ts';
import type { DescribeResponse } from '../contract/describe.d.ts';
import type { ListResponse, TreeResponse, UploadResponse, ContentResponse, SearchResponse, ExtractResponse } from '../contract/operations.d.ts';
import type { OperationReport } from '../contract/report.d.ts';
export declare function assertNode(value: unknown): Node;
export declare function assertNodeList(value: unknown): Node[];
export declare function assertListing(value: unknown): ListResponse;
export declare function assertSearch(value: unknown): SearchResponse;
export declare function assertExtract(value: unknown): ExtractResponse;
export declare function assertTree(value: unknown): TreeResponse;
export declare function assertNodeResponse(value: unknown): {
    node: Node;
};
export declare function assertContent(value: unknown): ContentResponse;
export declare function assertUpload(value: unknown): UploadResponse;
export declare function assertReport(value: unknown): OperationReport;
export declare function assertDescribe(value: unknown): DescribeResponse;
//# sourceMappingURL=guards.d.ts.map