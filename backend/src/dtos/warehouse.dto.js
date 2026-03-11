const updateWarehouseDTO = (data = {}) => {
	const payload = {};

	if (Object.prototype.hasOwnProperty.call(data, 'name')) {
		payload.name = data.name;
	}
	if (Object.prototype.hasOwnProperty.call(data, 'location')) {
		payload.location = data.location;
	}
	if (Object.prototype.hasOwnProperty.call(data, 'description')) {
		payload.description = data.description;
	}

	return payload;
};

module.exports = {
	updateWarehouseDTO,
};
