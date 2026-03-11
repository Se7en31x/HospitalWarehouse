const updateCategoryDTO = (data = {}) => {
	const payload = {};

	if (Object.prototype.hasOwnProperty.call(data, 'name')) {
		payload.name = data.name;
	}
	if (Object.prototype.hasOwnProperty.call(data, 'code_prefix')) {
		payload.code_prefix = data.code_prefix;
	}
	if (Object.prototype.hasOwnProperty.call(data, 'description')) {
		payload.description = data.description;
	}

	return payload;
};

module.exports = {
	updateCategoryDTO,
};
