# distutils: language=C

# Cython wrapper for libsoxr
# https://github.com/dofuuz/python-soxr

cdef extern from 'soxr.h':
    ctypedef struct soxr_io_spec_t:
        pass
    ctypedef struct soxr_quality_spec_t:
        pass
    ctypedef struct soxr_runtime_spec_t:
        pass

    ctypedef struct soxr:
        pass
    ctypedef soxr * soxr_t
    ctypedef const char * soxr_error_t

    ctypedef const void * soxr_in_t
    ctypedef void * soxr_out_t

    cdef const char * soxr_version()

    cdef soxr_t soxr_create(
        double input_rate, double output_rate, unsigned num_channels,
        soxr_error_t *, const soxr_io_spec_t *, const soxr_quality_spec_t *, const soxr_runtime_spec_t *)

    cdef soxr_error_t soxr_process(
        soxr_t resampler,
        soxr_in_t in_, size_t ilen, size_t *idone,
        soxr_out_t out, size_t olen, size_t *odone) nogil

    cdef soxr_error_t soxr_error(soxr_t)
    cdef size_t * soxr_num_clips(soxr_t)
    cdef double soxr_delay(soxr_t)
    cdef const char * soxr_engine(soxr_t)

    cdef soxr_error_t soxr_clear(soxr_t)
    cdef void soxr_delete(soxr_t) nogil

    cdef soxr_error_t soxr_oneshot(
        double input_rate, double output_rate, unsigned num_channels,
        soxr_in_t in_, size_t ilen, size_t *idone,
        soxr_out_t out, size_t olen, size_t *odone,
        const soxr_io_spec_t *, const soxr_quality_spec_t *, const soxr_runtime_spec_t *)

    ctypedef enum soxr_datatype_t:
        SOXR_FLOAT32, SOXR_FLOAT64, SOXR_INT32, SOXR_INT16, SOXR_SPLIT = 4,
        SOXR_FLOAT32_I = SOXR_FLOAT32, SOXR_FLOAT64_I, SOXR_INT32_I, SOXR_INT16_I,
        SOXR_FLOAT32_S = SOXR_SPLIT  , SOXR_FLOAT64_S, SOXR_INT32_S, SOXR_INT16_S

    cdef soxr_quality_spec_t soxr_quality_spec(unsigned long recipe, unsigned long flags)

    cdef unsigned long SOXR_QQ
    cdef unsigned long SOXR_LQ
    cdef unsigned long SOXR_MQ
    cdef unsigned long SOXR_HQ
    cdef unsigned long SOXR_VHQ

    cdef soxr_io_spec_t soxr_io_spec(soxr_datatype_t itype, soxr_datatype_t otype)


cdef extern from 'csoxr_version.h':
    cdef const char * libsoxr_version()
