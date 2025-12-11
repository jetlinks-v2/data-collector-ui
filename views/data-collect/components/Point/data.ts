export const getAccessModes = (item) => {
    return item?.accessModes?.map((i) => i?.value);
};
