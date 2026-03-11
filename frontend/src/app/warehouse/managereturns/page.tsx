export const dynamic = 'force-dynamic';

import ReturnsClient from "./ReturnsClient";

export default async function ManageReturnsPage() {
	// Note: Initial data fetching can be done in the client component
	// to maintain real-time sync with Socket.io updates
	
	return (
		<main className="bg-gray-50">
			<ReturnsClient />
		</main>
	);
}
