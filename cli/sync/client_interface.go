package sync

// SyncClient defines the API used by the sync engine for push/pull operations.
// *Config implements this interface for production use.
type SyncClient interface {
	SyncGet(lastSyncAt string) (*syncGetResponse, error)
	SyncPost(operations []syncOp) (lastSyncAt string, err error)
	UploadImage(documentID, filePath string, data []byte) (blobURL string, err error)
}
