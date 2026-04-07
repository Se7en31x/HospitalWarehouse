export const getDaysUntilExpiry = (expiryDate: string | null) => {
	if (!expiryDate) {
		return Infinity;
	}

	const now = new Date();
	const expiry = new Date(expiryDate);
	const diffMs = expiry.getTime() - now.getTime();
	return Math.ceil(diffMs / (1000 * 3600 * 24));
};

export const isNearExpiryDate = (expiryDate: string | null, days = 90) => {
	const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
	return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
};

export const getNearExpiryWindowLabel = (expiryDate: string | null) => {
	const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

	if (daysUntilExpiry === Infinity) {
		return "ไม่ระบุ";
	}

	if (daysUntilExpiry <= 30) {
		return `อีก ${daysUntilExpiry} วัน`;
	}

	if (daysUntilExpiry <= 60) {
		return `อีก ${daysUntilExpiry} วัน`;
	}

	if (daysUntilExpiry <= 90) {
		return `อีก ${daysUntilExpiry} วัน`;
	}

	return "ปกติ";
};

export const getNearExpiryWindowColor = (expiryDate: string | null) => {
	const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

	if (daysUntilExpiry === Infinity) {
		return "bg-slate-100 text-slate-600";
	}

	if (daysUntilExpiry <= 30) {
		return "bg-red-100 text-red-700";
	}

	if (daysUntilExpiry <= 60) {
		return "bg-amber-100 text-amber-700";
	}

	if (daysUntilExpiry <= 90) {
		return "bg-yellow-100 text-yellow-700";
	}

	return "bg-slate-100 text-slate-600";
};
